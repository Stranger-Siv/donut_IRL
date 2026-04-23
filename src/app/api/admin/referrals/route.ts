import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Referral } from "@/models/Referral.model";
import { User } from "@/models/User.model";
import { INELIGIBLE_REASONS } from "@/lib/referral-ineligible";
import { REFERRAL_VOLUME_THRESHOLD_M } from "@/lib/constants";
import { logAdminAction, getRequestIp } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const patchBody = z.object({
  referralId: z.string(),
  action: z.enum([
    "approve_reward",
    "reject",
    "set_ineligible",
    "edit_note",
    "disable_referrer_code",
    "mark_referrer_payout_delivered",
  ]),
  adminNote: z.string().max(2000).optional(),
  /** Shown to referrer/invitee on /referrals when setting INELIGIBLE (admin/reject). */
  publicIneligibleMessage: z.string().max(500).optional(),
  rewardMillionIg: z.string().max(20).optional(),
});

export async function GET() {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const rows = await Referral.find()
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  const ids = new Set<string>();
  rows.forEach((r) => {
    ids.add(r.referrerId.toString());
    ids.add(r.referredId.toString());
  });
  const users = await User.find({ _id: { $in: Array.from(ids) } })
    .select("email name referralCode referralCodeDisabled inGameName")
    .lean();
  const umap = new Map(users.map((u) => [u._id.toString(), u] as const));

  const total = rows.length;
  const successful = rows.filter((r) => r.status === "REWARDED").length;
  const pending = rows.filter((r) => r.status === "PENDING").length;
  const abuseFlags = rows.filter(
    (r) => (r as { adminNote?: string }).adminNote?.includes("abuse")
  ).length;

  const mapRow = (r: (typeof rows)[0]) => {
    const refUser = umap.get(r.referrerId.toString());
    const refdUser = umap.get(r.referredId.toString());
    const payoutAt = (r as { referrerPayoutDeliveredAt?: Date | null })
      .referrerPayoutDeliveredAt;
    return {
      _id: r._id.toString(),
      referrerId: r.referrerId.toString(),
      referredId: r.referredId.toString(),
      code: r.code,
      status: r.status,
      progressVolumeM: r.progressVolumeM ?? 0,
      rewardReferrerGiven: r.rewardReferrerGiven,
      rewardMillionIg: r.rewardMillionIg,
      adminNote: r.adminNote,
      ineligibleReason: (r as { ineligibleReason?: string }).ineligibleReason ?? "",
      ineligibleUserMessage: (r as { ineligibleUserMessage?: string }).ineligibleUserMessage ?? "",
      createdAt: r.createdAt,
      referrerEmail: refUser?.email,
      referredEmail: refdUser?.email,
      referrerInGameName: (refUser as { inGameName?: string } | undefined)?.inGameName?.trim() || "",
      referredInGameName: (refdUser as { inGameName?: string } | undefined)?.inGameName?.trim() || "",
      referrerPayoutDeliveredAt: payoutAt ? new Date(payoutAt).toISOString() : null,
    };
  };

  const items = rows.map(mapRow);
  const payoutsPending = items.filter(
    (it) => it.status === "REWARDED" && !it.referrerPayoutDeliveredAt
  );

  return NextResponse.json({
    summary: { total, successful, pending, abuseFlags },
    items,
    payoutsPending,
  });
}

export async function PATCH(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const json = await req.json();
  const p = patchBody.safeParse(json);
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const ref = await Referral.findById(p.data.referralId);
  if (!ref) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ip = getRequestIp(req.headers);
  const { action, adminNote, publicIneligibleMessage, rewardMillionIg } = p.data;

  if (adminNote !== undefined) ref.adminNote = adminNote;
  if (rewardMillionIg) ref.rewardMillionIg = rewardMillionIg;

  if (action === "mark_referrer_payout_delivered" && ref.status !== "REWARDED") {
    return NextResponse.json(
      { error: "Payout can only be marked for REWARDED referrals" },
      { status: 400 }
    );
  }
  if (action === "mark_referrer_payout_delivered" && (ref as { referrerPayoutDeliveredAt?: Date | null }).referrerPayoutDeliveredAt) {
    return NextResponse.json({ error: "Payout already marked" }, { status: 400 });
  }

  switch (action) {
    case "approve_reward": {
      ref.status = "REWARDED";
      ref.rewardReferrerGiven = true;
      const cur = ref.progressVolumeM || 0;
      if (cur < REFERRAL_VOLUME_THRESHOLD_M) {
        ref.progressVolumeM = REFERRAL_VOLUME_THRESHOLD_M;
      }
      break;
    }
    case "reject":
    case "set_ineligible":
      ref.status = "INELIGIBLE";
      ref.ineligibleReason = INELIGIBLE_REASONS.ADMIN;
      if (publicIneligibleMessage !== undefined) {
        ref.ineligibleUserMessage = publicIneligibleMessage.trim();
      }
      break;
    case "edit_note":
      break;
    case "disable_referrer_code": {
      const u = await User.findById(ref.referrerId);
      if (u) {
        u.referralCodeDisabled = true;
        await u.save();
      }
      break;
    }
    case "mark_referrer_payout_delivered": {
      (ref as { referrerPayoutDeliveredAt?: Date | null }).referrerPayoutDeliveredAt = new Date();
      break;
    }
    default:
      break;
  }
  await ref.save();
  await logAdminAction(s.id, `referral.${action}`, {
    entityType: "Referral",
    entityId: ref._id.toString(),
    ip,
  });
  return NextResponse.json({ ok: true });
}
