import { Schema, models, model } from "mongoose";

/**
 * Global INR-per-1M rates for the three auto seller tiers.
 * Single document with _id: "global".
 */
const rateSettingsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    standardRate: { type: Number, required: true, default: 1.8 },
    goldRate: { type: Number, required: true, default: 1.9 },
    diamondRate: { type: Number, required: true, default: 2.0 },
  },
  { timestamps: true }
);

export const RateSettings = models.RateSettings || model("RateSettings", rateSettingsSchema);
