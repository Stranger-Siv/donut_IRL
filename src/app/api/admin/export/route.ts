import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order.model";
import { User } from "@/models/User.model";
import { Referral } from "@/models/Referral.model";

export const dynamic = "force-dynamic";

function csvRow(cells: (string | number)[]) {
  return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",") + "\n";
}

export async function GET(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "orders";
  await connectDB();

  if (type === "users") {
    const users = await User.find().select("email name role sellerTier totalSoldInr createdAt").lean();
    let head = "email,name,role,tier,totalSoldInr,createdAt\n";
    for (const u of users) {
      head += csvRow([
        u.email!,
        u.name!,
        u.role!,
        u.sellerTier!,
        u.totalSoldInr ?? 0,
        (u as { createdAt?: Date }).createdAt
          ? new Date((u as { createdAt: Date }).createdAt).toISOString()
          : "",
      ]);
    }
    return new NextResponse(head, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="users.csv"',
      },
    });
  }

  if (type === "referrals") {
    const r = await Referral.find().lean();
    let head = "id,referrerId,referredId,status,progressVolumeM,rewarded\n";
    for (const x of r) {
      head += csvRow([
        x._id.toString(),
        x.referrerId.toString(),
        x.referredId.toString(),
        x.status,
        x.progressVolumeM ?? 0,
        x.rewardReferrerGiven ? 1 : 0,
      ]);
    }
    return new NextResponse(head, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="referrals.csv"',
      },
    });
  }

  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();
  const uids = Array.from(new Set(orders.map((o) => o.userId.toString())));
  const users = await User.find({ _id: { $in: uids } })
    .select("email")
    .lean();
  const um = new Map(users.map((u) => [u._id.toString(), u.email!]));
  let head =
    "id,userEmail,item,quantity,payout,method,status,createdAt,completedAt\n";
  for (const o of orders) {
    head += csvRow([
      o._id.toString(),
      um.get(o.userId.toString()) ?? "",
      o.itemName,
      o.quantity,
      o.payoutAmount,
      o.payoutMethod,
      o.status,
      o.createdAt ? new Date(o.createdAt).toISOString() : "",
      o.completedAt ? new Date(o.completedAt).toISOString() : "",
    ]);
  }
  return new NextResponse(head, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="orders.csv"',
    },
  });
}
