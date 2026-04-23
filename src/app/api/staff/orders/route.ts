import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { Order } from "@/models/Order.model";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (s.role !== "STAFF" && s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (s.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admins use /api/orders" },
      { status: 400 }
    );
  }
  await connectDB();
  const list = await Order.find({
    assignedTo: new Types.ObjectId(s.id),
  })
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(
    list.map((o) => ({
      _id: o._id.toString(),
      userId: o.userId.toString(),
      itemName: o.itemName,
      itemSlug: o.itemSlug,
      quantity: o.quantity,
      payoutAmount: o.payoutAmount,
      status: o.status,
      createdAt: o.createdAt,
      staffNote: o.staffNote,
    }))
  );
}
