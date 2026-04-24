import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import { Order } from "@/models/Order.model";
import { startOfTodayUtc, endOfTodayUtc } from "@/lib/today-utc";
import { Types } from "mongoose";
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
  const t0 = startOfTodayUtc();
  const t1 = endOfTodayUtc();

  const staff = await User.find({ role: { $in: ["STAFF", "ADMIN"] } })
    .select("name email role createdAt")
    .lean();

  const out = await Promise.all(
    staff.map(async (u) => {
      const uid = u._id;
      const [active, doneToday, failAgg, timeAgg] = await Promise.all([
        Order.countDocuments({
          assignedTo: uid,
          status: { $in: ["ASSIGNED", "RECEIVED", "PAID"] },
        }),
        Order.countDocuments({
          assignedTo: uid,
          status: "COMPLETED",
          completedAt: { $gte: t0, $lte: t1 },
        }),
        Order.countDocuments({ assignedTo: uid, status: "CANCELLED" }),
        Order.aggregate([
          { $match: { assignedTo: new Types.ObjectId(uid), status: "COMPLETED" } },
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
      ]);
      const total = await Order.countDocuments({ assignedTo: uid });
      const cancelled = failAgg;
      const failRate = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0;
      return {
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        activeOrders: active,
        completedToday: doneToday,
        avgCompletionMinutes: timeAgg[0]?.avg != null ? Math.round(timeAgg[0].avg) : 0,
        failureRate: failRate,
        online: false,
      };
    })
  );
  return NextResponse.json(out);
}
