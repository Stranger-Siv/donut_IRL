import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import { Order } from "@/models/Order.model";
import { Referral } from "@/models/Referral.model";
import { REFERRAL_VOLUME_THRESHOLD_M } from "@/lib/constants";

export const dynamic = "force-dynamic";

type LeanUser = {
  _id: { toString: () => string };
  email?: string;
  name?: string;
  createdAt?: Date;
};

function toIso(d: Date | undefined) {
  return d ? new Date(d).toISOString() : null;
}

export async function GET() {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();

  const [dupIp, dupPayout, refRows, lastDone, highValue] = await Promise.all([
    User.aggregate([
      { $match: { role: "USER", signupIp: { $ne: "" } } },
      { $group: { _id: "$signupIp", c: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { c: { $gte: 2 } } },
      { $limit: 50 },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: "CANCELLED" }, payoutDetails: { $ne: "" } } },
      {
        $group: {
          _id: "$payoutDetails",
          c: { $sum: 1 },
          firstAt: { $min: "$createdAt" },
          lastAt: { $max: "$createdAt" },
          orderIds: { $push: "$_id" },
        },
      },
      { $match: { c: { $gte: 2 } } },
      { $sort: { c: -1 } },
      { $limit: 30 },
    ]),
    Referral.find({ status: "PENDING", progressVolumeM: { $gt: 40 } })
      .sort({ progressVolumeM: -1 })
      .limit(20)
      .lean(),
    Order.findOne({ status: "COMPLETED" })
      .sort({ completedAt: -1 })
      .select("payoutAmount itemName completedAt userId _id")
      .lean(),
    Order.find({
      status: { $in: ["PENDING", "ASSIGNED", "HOLD"] },
      payoutAmount: { $gte: 20000 },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("payoutAmount userId itemName itemSlug status payoutMethod createdAt _id")
      .lean(),
  ]);

  const allDupIpIds = Array.from(
    new Set(
      dupIp.flatMap((r) => (r.ids as { toString: () => string }[]).map((x) => x.toString()))
    )
  );
  const ipUsers = allDupIpIds.length
    ? await User.find({ _id: { $in: allDupIpIds } })
        .select("email name createdAt")
        .lean()
    : [];
  const ipUserMap = new Map(
    ipUsers.map((u) => [(u as LeanUser)._id.toString(), u as LeanUser])
  );

  const sameIp = dupIp.map((r) => {
    const ip = r._id as string;
    const ids = (r.ids as { toString: () => string }[]).map((x) => x.toString());
    const c = r.c as number;
    const members = ids.map((id) => {
      const u = ipUserMap.get(id);
      return {
        userId: id,
        email: u?.email ?? "—",
        name: (u as { name?: string })?.name?.trim() || "—",
        signedUpAt: toIso((u as { createdAt?: Date })?.createdAt) ?? null,
      };
    });
    const withDates = members.filter((m): m is typeof m & { signedUpAt: string } => !!m.signedUpAt);
    const firstSignupAt =
      withDates.length > 0
        ? withDates.reduce((a, b) => (a.signedUpAt < b.signedUpAt ? a : b)).signedUpAt
        : null;
    const lastSignupAt =
      withDates.length > 0
        ? withDates.reduce((a, b) => (a.signedUpAt > b.signedUpAt ? a : b)).signedUpAt
        : null;
    return {
      ip,
      count: c,
      userIds: ids,
      reason:
        "Two or more user accounts share the same signup IP (possible multi-accounting or shared network).",
      firstSignupAt,
      lastSignupAt,
      members,
    };
  });

  const duplicatePayoutDetails = (dupPayout as {
    _id: string;
    c: number;
    firstAt?: Date;
    lastAt?: Date;
    orderIds: { toString: () => string }[];
  }[]).map((r) => {
    const orderIds = (r.orderIds || []).map((x) => x.toString());
    return {
      detail: r._id,
      count: r.c,
      firstSeenAt: toIso(r.firstAt),
      lastSeenAt: toIso(r.lastAt),
      sampleOrderIds: orderIds.slice(0, 5),
      reason:
        "The same payout instruction (UPI / bank / crypto text) was used on more than one open or closed order. Review for linked accounts or typos re-used across sellers.",
    };
  });

  const refUids = Array.from(
    new Set(
      (refRows as { referrerId: unknown; referredId: unknown }[]).flatMap((x) => [
        (x.referrerId as { toString: () => string }).toString(),
        (x.referredId as { toString: () => string }).toString(),
      ])
    )
  );
  const refUserDocs = refUids.length
    ? await User.find({ _id: { $in: refUids } })
        .select("email name")
        .lean()
    : [];
  const refUserMap = new Map(
    refUserDocs.map((u) => [(u as LeanUser)._id.toString(), u as LeanUser])
  );

  const REF_NEAR = 40;
  const referralNearList = (refRows as {
    _id: { toString: () => string };
    code: string;
    referrerId: { toString: () => string };
    referredId: { toString: () => string };
    progressVolumeM?: number;
    createdAt: Date;
    updatedAt: Date;
  }[]).map((row) => {
    const refId = row.referrerId.toString();
    const redId = row.referredId.toString();
    const rU = refUserMap.get(refId);
    const dU = refUserMap.get(redId);
    const pm = row.progressVolumeM ?? 0;
    return {
      _id: row._id.toString(),
      code: row.code,
      progressVolumeM: pm,
      referredEmail: dU?.email ?? "—",
      referredName: (dU as { name?: string })?.name?.trim() || "—",
      referrerEmail: rU?.email ?? "—",
      linkCreatedAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      reason: `Referred user is at ${pm}M completed volume and still PENDING; reward unlocks at ${REFERRAL_VOLUME_THRESHOLD_M}M. Worth watching before it flips to REWARDED.`,
    };
  });

  const highUserIds = Array.from(new Set(highValue.map((o) => o.userId.toString())));
  const highUsers = highUserIds.length
    ? await User.find({ _id: { $in: highUserIds } })
        .select("email name")
        .lean()
    : [];
  const highUserMap = new Map(
    highUsers.map((u) => [(u as LeanUser)._id.toString(), u as LeanUser])
  );

  const lastUser =
    lastDone?.userId &&
    (await User.findById((lastDone as { userId: unknown }).userId)
      .select("email name")
      .lean());

  const highValuePending = (highValue as {
    _id: { toString: () => string };
    userId: { toString: () => string };
    payoutAmount: number;
    itemName: string;
    itemSlug: string;
    status: string;
    payoutMethod: string;
    createdAt: Date;
  }[]).map((o) => {
    const u = highUserMap.get(o.userId.toString());
    return {
      _id: o._id.toString(),
      payoutAmount: o.payoutAmount,
      userId: o.userId.toString(),
      userEmail: u?.email ?? "—",
      userName: (u as { name?: string })?.name?.trim() || "—",
      itemName: o.itemName,
      itemSlug: o.itemSlug,
      status: o.status,
      payoutMethod: o.payoutMethod,
      createdAt: toIso(o.createdAt),
      reason:
        "Order is still in pipeline and payout is at least ₹20,000 — high exposure if something goes wrong. Prioritize verification and payout reference checks.",
    };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    referralVolumeThresholdM: REFERRAL_VOLUME_THRESHOLD_M,
    referralNearMMin: REF_NEAR,
    sameIp,
    duplicatePayoutDetails,
    referralNearThreshold: refRows.length,
    referralNearList,
    lastCompleted: lastDone
      ? {
          orderId: (lastDone as { _id: { toString: () => string } })._id.toString(),
          completedAt: toIso((lastDone as { completedAt?: Date }).completedAt),
          payoutAmount: (lastDone as { payoutAmount: number }).payoutAmount,
          itemName: (lastDone as { itemName: string }).itemName,
          userEmail: (lastUser as LeanUser | null)?.email ?? "—",
          reason:
            "Most recently completed order in the system — sanity check that completions are still being recorded.",
        }
      : null,
    highValuePending,
  });
}
