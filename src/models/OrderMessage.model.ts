import { Schema, models, model } from "mongoose";

const roleEnum = ["SELLER", "STAFF", "ADMIN"] as const;

const orderMessageSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: roleEnum, required: true },
    /** Text; may be empty when the message is image-only (see attachmentUrls). */
    body: { type: String, maxlength: 4000, default: "" },
    /** Proof links: screenshots, Drive, imgur, etc. */
    attachmentUrls: { type: [String], default: [] },
  },
  { timestamps: true }
);

orderMessageSchema.index({ orderId: 1, createdAt: 1 });

export const OrderMessage = models.OrderMessage || model("OrderMessage", orderMessageSchema);
export type OrderMessageAuthorRole = (typeof roleEnum)[number];
