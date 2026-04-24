import { Schema, model, models } from "mongoose";

const orderMessageAttachmentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

orderMessageAttachmentSchema.index({ orderId: 1, createdAt: -1 });

export const OrderMessageAttachment =
  models.OrderMessageAttachment ||
  model("OrderMessageAttachment", orderMessageAttachmentSchema);

