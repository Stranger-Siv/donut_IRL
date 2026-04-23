import { Schema, models, model } from "mongoose";

const priceSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    itemSlug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    unitLabel: { type: String, default: "per unit" },
    /** For CURRENCY kind: INR/M from tier table at order time; kept for display fallback */
    currentPrice: { type: Number, required: true, min: 0 },
    /** CURRENCY = 1M lines (uses tier rates); ITEM = fixed INR per unit + equivalentM */
    kind: { type: String, enum: ["CURRENCY", "ITEM"], default: "ITEM" },
    /** M equivalent per 1 unit sold (1M money line = 1) */
    equivalentMPerUnit: { type: Number, default: 0 },
    /** Optional display/list price for future sell-side listings */
    sellPrice: { type: Number },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Price = models.Price || model("Price", priceSchema);
