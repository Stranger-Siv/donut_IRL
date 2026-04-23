import { Schema, models, model } from "mongoose";

const adminActivityLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    ip: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

adminActivityLogSchema.index({ createdAt: -1 });

export const AdminActivityLog =
  models.AdminActivityLog || model("AdminActivityLog", adminActivityLogSchema);
