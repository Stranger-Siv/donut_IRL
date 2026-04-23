import { Schema, models, model } from "mongoose";

const priceHistorySchema = new Schema(
  {
    itemName: { type: String, required: true },
    itemSlug: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

priceHistorySchema.index({ itemSlug: 1, date: -1 });

export const PriceHistory = models.PriceHistory || model("PriceHistory", priceHistorySchema);
