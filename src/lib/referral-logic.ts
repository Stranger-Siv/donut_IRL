import { connectDB } from "./mongodb";
import { User } from "@/models/User.model";
import { Referral } from "@/models/Referral.model";
import { Notification } from "@/models/Notification.model";
import { INELIGIBLE_REASONS } from "./referral-ineligible";
import { REFERRAL_REWARD_IG, REFERRAL_VOLUME_THRESHOLD_M } from "./constants";
import { sellerTierFromVolumeM } from "./tier";

/**
 * After an order is marked COMPLETED: volume, tier, referrer progress (50M+), referrer-only reward.
 */
export async function onOrderCompleted(
  userId: string,
  orderPayoutInr: number,
  equivalentVolume: number
): Promise<void> {
  await connectDB();
  const u = await User.findById(userId);
  if (!u) return;

  u.lifetimeVolumeSold = (u.lifetimeVolumeSold || 0) + equivalentVolume;
  u.sellerTier = sellerTierFromVolumeM(u.lifetimeVolumeSold);
  u.totalSoldInr = (u.totalSoldInr || 0) + orderPayoutInr;
  u.firstSellCompleted = true;
  await u.save();

  const ref = await Referral.findOne({ referredId: u._id });
  if (!ref || ref.status === "INELIGIBLE") return;

  const referrer = await User.findById(ref.referrerId);
  if (!referrer) {
    ref.status = "INELIGIBLE";
    ref.ineligibleReason = INELIGIBLE_REASONS.REFERRER_NOT_FOUND;
    await ref.save();
    return;
  }

  if (referrer._id.equals(u._id)) {
    ref.status = "INELIGIBLE";
    ref.ineligibleReason = INELIGIBLE_REASONS.SELF_REFERRAL;
    await ref.save();
    return;
  }

  if (u.signupIp && referrer.lastIp && u.signupIp === referrer.lastIp) {
    ref.status = "INELIGIBLE";
    ref.ineligibleReason = INELIGIBLE_REASONS.SAME_IP_AS_REFERRER;
    await ref.save();
    return;
  }

  ref.progressVolumeM = (ref.progressVolumeM || 0) + equivalentVolume;
  await ref.save();

  if (ref.rewardReferrerGiven || ref.status === "REWARDED") return;

  if (ref.progressVolumeM < REFERRAL_VOLUME_THRESHOLD_M) return;

  ref.rewardReferrerGiven = true;
  ref.status = "REWARDED";
  await ref.save();

  const msg = `Referral reward: ${REFERRAL_REWARD_IG} in-game for you — your invitee reached ${REFERRAL_VOLUME_THRESHOLD_M}M+ completed volume.`;
  await Notification.create({
    userId: referrer._id,
    type: "referral",
    title: "Referral reward",
    message: msg,
  });
}
