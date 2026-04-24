import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order.model";
import { User } from "@/models/User.model";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const rows = await Order.find({
    status: { $in: ["PAID", "RECEIVED", "COMPLETED"] },
  })
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();

  const uids = Array.from(new Set(rows.map((o) => o.userId.toString())));
  const users = await User.find({ _id: { $in: uids } })
    .select("name email")
    .lean();
  const umap = new Map(users.map((u) => [u._id.toString(), u] as const));

  return NextResponse.json(
    rows.map((o) => ({
      _id: o._id.toString(),
      userId: o.userId.toString(),
      userEmail: umap.get(o.userId.toString())?.email ?? "—",
      amount: o.payoutAmount,
      method: o.payoutMethod,
      status: o.status,
      reference: o.payoutReference || "",
      updatedAt: o.updatedAt,
      createdAt: o.createdAt,
    }))
  );
}
