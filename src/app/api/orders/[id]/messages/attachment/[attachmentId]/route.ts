import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { Order } from "@/models/Order.model";
import { OrderMessageAttachment } from "@/models/OrderMessageAttachment.model";
import { canReadOrder } from "@/lib/order-guards";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isObjectId24(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const { id: orderId, attachmentId } = await params;
  if (!isObjectId24(orderId) || !isObjectId24(attachmentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const o = await Order.findById(orderId);
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canReadOrder(o, s.id, s.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const a = await OrderMessageAttachment.findOne({ _id: attachmentId, orderId: o._id }).select(
    "contentType data sizeBytes"
  );
  if (!a || !a.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const data = a.data as Buffer;
  const contentType = (a.contentType as string | undefined) || "application/octet-stream";
  const bytes = new Uint8Array(data);
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

