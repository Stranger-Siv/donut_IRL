import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order.model";
import { User } from "@/models/User.model";
import { startOfDay, subDays, endOfDay } from "date-fns";
import { format } from "date-fns";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

const qSchema = z.object({
  range: z.enum(["today", "week", "month"]).default("week"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(req: Request) {
  const m = await maintenanceResponseIfBlocked(req);
  if (m) return m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const parsed = qSchema.safeParse({
    range: searchParams.get("range") ?? "week",
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad query" }, { status: 400 });
  }
  const { range, from: fromIso, to: toIso } = parsed.data;
  await connectDB();

  let end = new Date();
  let start = subDays(startOfDay(end), 6);
  if (fromIso && toIso) {
    start = startOfDay(new Date(fromIso));
    end = endOfDay(new Date(toIso));
  } else {
    end = new Date();
    start =
      range === "today"
        ? startOfDay(end)
        : range === "week"
          ? subDays(startOfDay(end), 6)
          : subDays(startOfDay(end), 29);
  }

  const [orders, perM, avgTime, daily, multiOrderUsers, refOrders, newUsers] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: "COMPLETED",
          completedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: "$payoutAmount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          status: "COMPLETED",
          itemSlug: { $in: ["1m", "1-m"] },
          completedAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, q: { $sum: "$quantity" }, p: { $sum: "$payoutAmount" } } },
    ]),
    Order.aggregate([
      {
        $match: { status: "COMPLETED", completedAt: { $gte: start, $lte: end } },
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
    Order.aggregate([
      {
        $match: { status: "COMPLETED", completedAt: { $gte: start, $lte: end } },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          spent: { $sum: "$payoutAmount" },
          earned: { $sum: { $multiply: ["$payoutAmount", 0.1] } },
          n: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      {
        $match: { status: "COMPLETED", completedAt: { $gte: start, $lte: end } },
      },
      { $group: { _id: "$userId", n: { $sum: 1 } } },
      { $match: { n: { $gte: 2 } } },
      { $count: "c" },
    ]),
    Order.aggregate([
      {
        $match: { status: "COMPLETED", completedAt: { $gte: start, $lte: end } },
      },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "u" } },
      { $match: { "u.referredBy": { $ne: null } } },
      { $count: "c" },
    ]),
    User.countDocuments({
      role: "USER",
      createdAt: { $gte: start, $lte: end },
    }),
  ]);

  const o0 = orders[0];
  const m0 = perM[0];
  const a0 = avgTime[0];
  const doneCount = o0?.count ?? 0;
  const netProfit = Math.round((o0?.totalSpent ?? 0) * 0.1 * 100) / 100;
  const multi = multiOrderUsers[0]?.c ?? 0;
  const refN = refOrders[0]?.c ?? 0;
  const uniqueBuyers = await Order.distinct("userId", {
    status: "COMPLETED",
    completedAt: { $gte: start, $lte: end },
  });
  const uCount = uniqueBuyers.length;
  const repeatSellerPct = uCount > 0 ? Math.round((multi / uCount) * 1000) / 10 : 0;
  const referralOrderPct = doneCount > 0 ? Math.round((refN / doneCount) * 1000) / 10 : 0;
  const conversionRate =
    newUsers > 0 ? Math.min(100, Math.round((uCount / newUsers) * 1000) / 10) : 0;

  return NextResponse.json({
    range: format(start, "yyyy-MM-dd") + " → " + format(end, "yyyy-MM-dd"),
    totalSpent: o0?.totalSpent ?? 0,
    ordersCompleted: doneCount,
    totalEarned: netProfit,
    netProfit,
    avgPerM:
      m0 && m0.q > 0 ? Math.round((m0.p / m0.q) * 1000) / 1000 : 0,
    avgCompletionMinutes: a0?.avg != null ? Math.round(a0.avg) : 0,
    repeatSellerPercent: repeatSellerPct,
    referralOrderPercent: referralOrderPct,
    conversionRate,
    newUsersInRange: newUsers,
    daily: daily.map((d) => ({
      day: d._id,
      spent: d.spent,
      earned: Math.round(d.earned * 100) / 100,
      orders: d.n,
    })),
  });
}
