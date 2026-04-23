import { type InferSchemaType, Schema, models, model } from "mongoose";

const priceAlertSchema = new Schema(
  {
    itemSlug: { type: String, required: true },
    targetPrice: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["USER", "STAFF", "ADMIN"],
      default: "USER",
    },
    /** Auto from lifetime volume (M equivalent) */
    sellerTier: {
      type: String,
      enum: ["STANDARD", "GOLD", "DIAMOND"],
      default: "STANDARD",
    },
    /** Legacy field — ignored if sellerTier set; migration path */
    tier: {
      type: String,
      enum: ["BRONZE", "SILVER", "GOLD"],
      required: false,
    },
    lifetimeVolumeSold: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true, uppercase: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    firstSellCompleted: { type: Boolean, default: false },
    signupIp: { type: String, default: "" },
    lastIp: { type: String, default: "" },
    totalSoldInr: { type: Number, default: 0 },
    referralRewardEarned: { type: Boolean, default: false },
    priceAlerts: [priceAlertSchema],
    riskFlags: [{ type: String, trim: true }],
    discordLinked: { type: Boolean, default: false },
    discordUserId: { type: String, default: "" },
    /** Admin */
    banned: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
    lastActiveAt: { type: Date },
    referralCodeDisabled: { type: Boolean, default: false },
    /** In-game name for manual referral / ops delivery (optional). */
    inGameName: { type: String, default: "", trim: true, maxlength: 80 },
    /** For STAFF: item slugs (or * ) they can pick up; empty = all items (skill-based assignment). */
    assignmentSkills: { type: [String], default: [] },
    /** TOTP (Google Authenticator) — base32, never select by default. */
    totpSecret: { type: String, default: "", select: false },
    /** When true, admin login also requires a valid 6-digit TOTP. */
    totpEnabled: { type: Boolean, default: false },
    /** sha256 hex of raw reset token; select: false in queries unless +field */
    passwordResetTokenHash: { type: String, default: "", select: false },
    passwordResetExpires: { type: Date, default: null },
    /** Throttle repeat "forgot password" emails. */
    passwordResetLastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = models.User || model("User", userSchema);
export type UserDoc = InferSchemaType<typeof userSchema>;
