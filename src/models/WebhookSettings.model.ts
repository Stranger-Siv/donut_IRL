import { Schema, models, model } from "mongoose";

const webhookSettingsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    completedTrades: { type: Boolean, default: true },
    rateUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    vouches: { type: Boolean, default: true },
    templateTrade: { type: String, default: "Trade: {body}" },
    templateRate: { type: String, default: "Rate: {body}" },
    templatePromo: { type: String, default: "{body}" },
  },
  { timestamps: true }
);

export const WebhookSettings = models.WebhookSettings || model("WebhookSettings", webhookSettingsSchema);
