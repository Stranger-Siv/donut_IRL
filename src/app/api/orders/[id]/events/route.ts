import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order.model";
import { canReadOrder } from "@/lib/order-guards";
import { orderChannelSub } from "@/lib/order-channel";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events: real-time `order` and `message` events for this order.
 * Same browser session cookie as the rest of the app (EventSource is same-origin).
 * For multi-server deployments, add Redis between instances or use a hosted pub/sub.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const { id: orderId } = await params;
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  await connectDB();
  const o = await Order.findById(orderId);
  if (!o) {
    return new Response("Not found", { status: 404 });
  }
  if (!canReadOrder(o, s.user.id, s.user.role!)) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          /* stream closed */
        }
      };
      const unsub = orderChannelSub(orderId, (ev) => {
        if (ev.type === "order") {
          send({ type: "order", order: ev.order });
        } else {
          send({ type: "message", message: ev.message });
        }
      });
      const ping = setInterval(() => {
        send({ type: "ping" as const, t: Date.now() });
      }, 25_000);
      const onAbort = () => {
        clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {
          /* */
        }
      };
      if (req.signal.aborted) {
        onAbort();
        return;
      }
      req.signal.addEventListener("abort", onAbort, { once: true });
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
