import { Schema, models, model } from "mongoose";

const analyticsDailySchema = new Schema(
  {
    day: { type: String, required: true, unique: true, index: true },
    totalSpentInr: { type: Number, default: 0 },
    totalEarnedInr: { type: Number, default: 0 },
    ordersCompleted: { type: Number, default: 0 },
    sumCompletionMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const AnalyticsDaily = models.AnalyticsDaily || model("AnalyticsDaily", analyticsDailySchema);
