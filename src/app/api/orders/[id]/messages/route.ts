import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { Order } from "@/models/Order.model";
import { OrderMessage } from "@/models/OrderMessage.model";
import { canReadOrder, canPostOrderMessage } from "@/lib/order-guards";
import { orderChannelPub } from "@/lib/order-channel";
import { attachmentUrlSchema } from "@/lib/order-message-attachments";
import { toMessageResponse } from "@/lib/order-message-serialize";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

const postBody = z
  .object({
    body: z.string().max(4000).default(""),
    attachmentUrls: z
      .array(attachmentUrlSchema)
      .max(5)
      .optional()
      .default([]),
  })
  .refine(
    (d) => d.body.trim().length > 0 || (d.attachmentUrls && d.attachmentUrls.length > 0),
    { message: "Add a message or at least one link." }
  );

function authorRole(
  userId: string,
  orderUserId: string,
  role: string
): "SELLER" | "STAFF" | "ADMIN" {
  if (role === "ADMIN") return "ADMIN";
  if (userId === orderUserId) return "SELLER";
  return "STAFF";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const __m = await maintenanceResponseIfBlocked(_req);
  if (__m) return __m;
  const { id } = await params;
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const o = await Order.findById(id);
  if (!o) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canReadOrder(o, s.id, s.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await OrderMessage.find({ orderId: o._id })
    .sort({ createdAt: 1 })
    .limit(300)
    .populate("userId", "name email")
    .lean();
  const messages = raw.map((m) =>
    toMessageResponse(
      m as unknown as import("@/lib/order-message-serialize").OrderMessagePopulated
    )
  );
  return NextResponse.json({ messages });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const { id } = await params;
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = postBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors[0] || "Invalid input" },
      { status: 400 }
    );
  }
  await connectDB();
  const o = await Order.findById(id);
  if (!o) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canReadOrder(o, s.id, s.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canPostOrderMessage(o, s.id, s.role)) {
    return NextResponse.json(
      { error: "You cannot post on this order." },
      { status: 403 }
    );
  }
  const { body, attachmentUrls } = parsed.data;
  const ar = authorRole(s.id, o.userId.toString(), s.role);
  const created = await OrderMessage.create({
    orderId: o._id,
    userId: s.id,
    authorRole: ar,
    body: body.trim(),
    attachmentUrls: attachmentUrls ?? [],
  });
  const populated = await OrderMessage.findById(created._id)
    .populate("userId", "name email")
    .lean();
  if (!populated) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
  const message = toMessageResponse(
    populated as import("@/lib/order-message-serialize").OrderMessagePopulated
  );
  orderChannelPub(id, { type: "message", message });
  return NextResponse.json({ message });
}
