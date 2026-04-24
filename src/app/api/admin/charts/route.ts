import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order.model";
import { subDays, startOfDay } from "date-fns";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const days = Math.min(60, Math.max(7, parseInt(searchParams.get("days") || "14", 10) || 14));
  const end = new Date();
  const start = startOfDay(subDays(end, days - 1));
  await connectDB();

  const [daily, topItems, profitByDay] = await Promise.all([
    Order.aggregate([
      { $match: { status: "COMPLETED", completedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          spent: { $sum: "$payoutAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: "COMPLETED", completedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$itemName",
          qty: { $sum: "$quantity" },
          payout: { $sum: "$payoutAmount" },
        },
      },
      { $sort: { payout: -1 } },
      { $limit: 8 },
    ]),
    Order.aggregate([
      { $match: { status: "COMPLETED", completedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          profit: { $sum: { $multiply: ["$payoutAmount", 0.1] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return NextResponse.json({
    rangeDays: days,
    daily: daily.map((d) => ({
      day: d._id,
      spend: d.spent,
      revenue: Math.round(d.spent * 0.1 * 100) / 100,
      orders: d.orders,
    })),
    profitByDay: profitByDay.map((d) => ({
      day: d._id,
      profit: Math.round(d.profit * 100) / 100,
    })),
    topItems: topItems.map((t) => ({
      name: t._id,
      quantity: t.qty,
      payout: t.payout,
    })),
  });
}
