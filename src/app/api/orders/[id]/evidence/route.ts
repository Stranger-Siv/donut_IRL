import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { canReadOrder } from "@/lib/order-guards";
import { Order } from "@/models/Order.model";
import { orderChannelPub } from "@/lib/order-channel";
import { toOrderResponse } from "@/lib/order-response";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

const body = z.object({ url: z.string().url().max(2000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const { id: orderId } = await params;
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const p = body.safeParse(json);
  if (!p.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  await connectDB();
  const o = await Order.findById(orderId);
  if (!o) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canReadOrder(o, s.id, s.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const asOwner = o.userId.toString() === s.id;
  const isStaff = s.role === "STAFF" && o.assignedTo?.toString() === s.id;
  const isAdmin = s.role === "ADMIN";
  if (!isAdmin && !asOwner && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["PENDING", "ASSIGNED", "RECEIVED", "HOLD", "REVIEW", "PAID"].includes(o.status)) {
    return NextResponse.json(
      { error: "Cannot add evidence for this order state" },
      { status: 400 }
    );
  }
  const list = [...(o.evidenceUrls ?? [])];
  if (list.length >= 5) {
    return NextResponse.json({ error: "Maximum 5 evidence files" }, { status: 400 });
  }
  o.evidenceUrls = [...list, p.data.url];
  await o.save();
  const pub = toOrderResponse(o);
  orderChannelPub(orderId, { type: "order", order: pub });
  return NextResponse.json({ ok: true, order: pub, evidenceUrls: o.evidenceUrls });
}
