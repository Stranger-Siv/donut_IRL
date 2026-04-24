import { Schema, models, model } from "mongoose";

const referralSchema = new Schema(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referredId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    code: { type: String, required: true, uppercase: true },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "REWARDED", "INELIGIBLE"],
      default: "PENDING",
    },
    /**
     * Why `INELIGIBLE` was set (e.g. SAME_IP_AS_REFERRER, ADMIN). See `referral-ineligible.ts`.
     * Optional; legacy rows may be empty.
     */
    ineligibleReason: { type: String, default: "" },
    /**
     * Optional text shown to referrer/invitee on /referrals (e.g. from support when using ADMIN).
     */
    ineligibleUserMessage: { type: String, default: "" },
    /** Completed sell volume (M) from referred user */
    progressVolumeM: { type: Number, default: 0 },
    /** Referrer-only 5M in-game; set when threshold met */
    rewardReferrerGiven: { type: Boolean, default: false },
    /**
     * When staff confirmed the in-game referral reward was paid to the referrer
     * (separate from approving the reward in the main table).
     */
    referrerPayoutDeliveredAt: { type: Date, default: null },
    /** When invitee first met the referral goal and row entered COMPLETED state. */
    completedAt: { type: Date, default: null },
    rewardMillionIg: { type: String, default: "5" },
    referredIp: { type: String, default: "" },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

referralSchema.index({ referrerId: 1 });

export const Referral = models.Referral || model("Referral", referralSchema);
