import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order.model";
import { User } from "@/models/User.model";
import { startOfTodayUtc, endOfTodayUtc } from "@/lib/today-utc";
import { startOfMonth, endOfMonth } from "date-fns";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

const pipeline = ["PENDING", "ASSIGNED", "RECEIVED", "PAID", "HOLD"] as const;

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const t0 = startOfTodayUtc();
  const t1 = endOfTodayUtc();
  const m0 = startOfMonth(new Date());
  const m1 = endOfMonth(new Date());

  const [
    todayDone,
    todayAgg,
    pending,
    todayTimes,
    activeUsers,
    monthPayout,
  ] = await Promise.all([
    Order.countDocuments({
      status: "COMPLETED",
      completedAt: { $gte: t0, $lte: t1 },
    }),
    Order.aggregate([
      {
        $match: {
          status: "COMPLETED",
          completedAt: { $gte: t0, $lte: t1 },
        },
      },
      {
        $group: {
          _id: null,
          spent: { $sum: "$payoutAmount" },
          rev: { $sum: { $multiply: ["$payoutAmount", 0.1] } },
        },
      },
    ]),
    Order.countDocuments({ status: { $in: pipeline } }),
    Order.aggregate([
      {
        $match: {
          status: "COMPLETED",
          completedAt: { $gte: t0, $lte: t1 },
        },
      },
      {
        $project: {
          m: {
            $divide: [
              { $subtract: ["$completedAt", "$createdAt"] },
              60000,
            ],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: "$m" } } },
    ]),
    User.countDocuments({
      role: "USER",
      lastActiveAt: { $gte: t0, $lte: t1 },
    }),
    Order.aggregate([
      {
        $match: {
          status: "COMPLETED",
          completedAt: { $gte: m0, $lte: m1 },
        },
      },
      { $group: { _id: null, sum: { $sum: "$payoutAmount" } } },
    ]),
  ]);

  const spent = todayAgg[0]?.spent ?? 0;
  const revenue = todayAgg[0]?.rev ?? 0;
  const profit = Math.round((revenue - 0) * 100) / 100; // est margin = 10% of spent
  const avg = todayTimes[0]?.avg;
  const month = monthPayout[0]?.sum ?? 0;

  return NextResponse.json({
    todaySpent: Math.round(spent * 100) / 100,
    todayRevenue: Math.round(revenue * 100) / 100,
    todayProfit: Math.round(profit * 100) / 100,
    pendingOrders: pending,
    completedToday: todayDone,
    avgCompletionMinutes: avg != null ? Math.round(avg) : 0,
    activeUsersToday: activeUsers,
    totalPayoutThisMonth: Math.round(month * 100) / 100,
  });
}
