import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order.model";
import { User } from "@/models/User.model";
import { Types } from "mongoose";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (s.role !== "USER") {
    return NextResponse.json({ error: "Seller accounts only" }, { status: 403 });
  }
  await connectDB();
  const u = await User.findById(s.id).select("totalSoldInr").lean();
  const uid = new Types.ObjectId(s.id);
  const [pendingAgg, recent] = await Promise.all([
    Order.aggregate<{ s: number }>([
      {
        $match: {
          userId: uid,
          status: { $in: ["PENDING", "ASSIGNED", "RECEIVED", "PAID", "HOLD", "REVIEW"] },
        },
      },
      { $group: { _id: null, s: { $sum: "$payoutAmount" } } },
    ]),
    Order.find({ userId: uid, status: "COMPLETED" })
      .sort({ completedAt: -1 })
      .limit(20)
      .select("payoutAmount itemName completedAt _id")
      .lean(),
  ]);
  const pendingInr = pendingAgg[0]?.s ?? 0;
  return NextResponse.json({
    totalCompletedInr: u?.totalSoldInr ?? 0,
    pendingPayoutInr: pendingInr,
    /** Lifetime completed payouts match totalSoldInr if analytics stay in sync. */
    recentCompleted: recent.map((o) => ({
      _id: o._id.toString(),
      itemName: o.itemName,
      payoutAmount: o.payoutAmount,
      completedAt: o.completedAt,
    })),
  });
}
