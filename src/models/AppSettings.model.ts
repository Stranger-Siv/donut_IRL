import { Schema, models, model } from "mongoose";

const appSettingsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    maintenanceMode: { type: Boolean, default: false },
    /** Minimum order size for in-game money (quantity = how many 1M). */
    minSellQuantityM: { type: Number, default: 1, min: 0.0001 },
    /** Minimum units per order for fixed-₹ item lines. */
    minSellItemUnits: { type: Number, default: 1, min: 0.0001 },
    referralRewardM: { type: String, default: "5" },
    currencySymbol: { type: String, default: "₹" },
    timezone: { type: String, default: "Asia/Kolkata" },
    supportUrl: { type: String, default: "" },
    autoCancelHours: { type: Number, default: null },
    /** Stops new calculated quotes when true; admin messages still go out */
    globalPricingPaused: { type: Boolean, default: false },
    emergencyPause: { type: Boolean, default: false },
    /** Comma or newline separated CIDR/IPs; empty = off */
    adminIpAllowlist: { type: String, default: "" },
    twoFactorEnforced: { type: Boolean, default: false },
    /** Median / target hours from assignment → completed (for ETA copy). */
    defaultSlaHours: { type: Number, default: 24, min: 1 },
    /** Local "open" hours in settings timezone, e.g. 10:00–22:00. */
    businessDayStart: { type: String, default: "10:00" },
    businessDayEnd: { type: String, default: "22:00" },
    /** 0=Sun .. 6=Sat; e.g. "1,2,3,4,5" = Mon–Fri */
    businessDays: { type: String, default: "1,2,3,4,5" },
    /** MANUAL: admin assigns; ROUND_ROBIN; LOAD: fewest open; SKILL: item slug match. */
    assignmentMode: {
      type: String,
      enum: ["MANUAL", "ROUND_ROBIN", "LOAD", "SKILL"],
      default: "MANUAL",
    },
    /**
     * Max orders per itemSlug accepted per rolling 24h (PENDING+ASSIGNED+RECEIVED+… non-terminal).
     * Keys: item slug, "_default" fallback. Empty = no limit.
     */
    itemDailyCapacity: { type: Schema.Types.Mixed, default: {} },
    /** FX for display (INR per 1 USD / EUR) — non-binding. */
    displayFxUsdInr: { type: Number, default: 83 },
    displayFxEurInr: { type: Number, default: 90 },
    /** For ROUND_ROBIN: last auto-assigned staff (Mongo id string). */
    lastRoundRobinStaffId: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AppSettings = models.AppSettings || model("AppSettings", appSettingsSchema);
