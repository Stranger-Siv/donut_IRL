import { Schema, models, model } from "mongoose";

const adminNoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const AdminNote = models.AdminNote || model("AdminNote", adminNoteSchema);
