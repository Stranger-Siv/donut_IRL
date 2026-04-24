import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { Referral } from "@/models/Referral.model";
import { User } from "@/models/User.model";
import { explainIneligibility, INELIGIBILITY_EXPLANATION_FALLBACK } from "@/lib/referral-ineligible";
import { REFERRAL_REWARD_IG, REFERRAL_VOLUME_THRESHOLD_M } from "@/lib/constants";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

function normIneligibleSt(st: string | undefined) {
  return String(st ?? "")
    .trim()
    .toUpperCase();
}

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const u = await User.findById(s.id)
    .select("referralCode inGameName")
    .lean();
  if (!u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asReferrerPending = await Referral.countDocuments({
    referrerId: u._id,
    status: "PENDING",
  });
  const asReferrerRewarded = await Referral.countDocuments({
    referrerId: u._id,
    status: { $in: ["COMPLETED", "REWARDED"] },
  });
  const asReferred = await Referral.findOne({ referredId: u._id })
    .select("status progressVolumeM ineligibleReason ineligibleUserMessage")
    .lean();
  const asReferrerInvites = await Referral.find({ referrerId: u._id })
    .select(
      "progressVolumeM status createdAt referredId ineligibleReason ineligibleUserMessage"
    )
    .sort({ createdAt: -1 })
    .lean();

  const refIds = asReferrerInvites.map(
    (row) => (row as { referredId: { toString(): string } }).referredId
  );
  const refUsers = refIds.length
    ? await User.find({ _id: { $in: refIds } })
        .select("name firstSellCompleted lastActiveAt inGameName")
        .lean()
    : [];
  const byReferred = new Map(
    refUsers.map((ru) => [
      (ru as { _id: { toString(): string } })._id.toString(),
      ru as {
        name?: string;
        firstSellCompleted?: boolean;
        lastActiveAt?: Date;
        inGameName?: string;
      },
    ])
  );

  const uWithIgn = u as { referralCode: string; inGameName?: string };
  return NextResponse.json({
    referralCode: uWithIgn.referralCode,
    inGameName: (uWithIgn.inGameName || "").trim(),
    referredPendingCount: asReferrerPending,
    referredCompletedRewards: asReferrerRewarded,
    minVolumeMForReward: REFERRAL_VOLUME_THRESHOLD_M,
    rewardInGame: REFERRAL_REWARD_IG,
    rewardGoesTo: "referrer only",
    /** Each person you referred (volume counts only after their orders are COMPLETED). */
    invites: asReferrerInvites.map((r) => {
      const row = r as {
        _id: { toString(): string };
        referredId: { toString(): string };
        createdAt: Date;
        progressVolumeM?: number;
        status: string;
        ineligibleReason?: string;
        ineligibleUserMessage?: string;
      };
      const referredIdStr = row.referredId.toString();
      const sub = byReferred.get(referredIdStr);
      const progressVolumeM = row.progressVolumeM ?? 0;
      const stNorm = String(row.status || "")
        .trim()
        .toUpperCase();
      const displayProgressM =
        stNorm === "REWARDED" || stNorm === "COMPLETED"
          ? Math.max(progressVolumeM, REFERRAL_VOLUME_THRESHOLD_M)
          : progressVolumeM;
      return {
        _id: row._id.toString(),
        progressVolumeM,
        displayProgressM,
        status: row.status,
        displayName: (sub?.name?.trim() || "Seller").slice(0, 80),
        referredInGameName: sub?.inGameName?.trim()
          ? sub.inGameName.trim().slice(0, 80)
          : null,
        /** When they used your link (referral record created). */
        signedUpAt: row.createdAt.toISOString(),
        /** Set on each successful login. */
        lastActiveAt: sub?.lastActiveAt
          ? new Date(sub.lastActiveAt).toISOString()
          : null,
        hasCompletedTrade: Boolean(sub?.firstSellCompleted),
        ineligibilityExplanation: (() => {
          const exp = explainIneligibility(
            row.status,
            row.ineligibleReason,
            row.ineligibleUserMessage
          );
          return normIneligibleSt(row.status) === "INELIGIBLE"
            ? (exp ?? INELIGIBILITY_EXPLANATION_FALLBACK)
            : exp;
        })(),
      };
    }),
    yourReferral: asReferred
      ? (() => {
          const s = (asReferred as { status: string }).status;
          const exp = explainIneligibility(
            s,
            (asReferred as { ineligibleReason?: string }).ineligibleReason,
            (asReferred as { ineligibleUserMessage?: string }).ineligibleUserMessage
          );
          const progressVolumeM =
            (asReferred as { progressVolumeM?: number }).progressVolumeM ?? 0;
          const sNorm = normIneligibleSt(s);
          const displayProgressM =
            sNorm === "REWARDED" || sNorm === "COMPLETED"
              ? Math.max(progressVolumeM, REFERRAL_VOLUME_THRESHOLD_M)
              : progressVolumeM;
          return {
            status: s,
            progressVolumeM,
            displayProgressM,
            ineligibilityExplanation:
              normIneligibleSt(s) === "INELIGIBLE"
                ? (exp ?? INELIGIBILITY_EXPLANATION_FALLBACK)
                : exp,
          };
        })()
      : null,
  });
}
