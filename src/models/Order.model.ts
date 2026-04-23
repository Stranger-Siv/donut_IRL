import { Schema, models, model } from "mongoose";

const ORDER_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "RECEIVED",
  "PAID",
  "COMPLETED",
  "CANCELLED",
  "HOLD",
  /** Dispute / manual review (seller may see publicStaffNote) */
  "REVIEW",
] as const;

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    itemName: { type: String, required: true },
    itemSlug: { type: String, required: true },
    itemType: { type: String, default: "ITEM" },
    quantity: { type: Number, required: true, min: 0 },
    /** Equivalent in-game M volume (for tier + referral progress) */
    equivalentVolume: { type: Number, required: true, default: 0 },
    unitPrice: { type: Number, required: true },
    basePayoutInr: { type: Number, required: true },
    tierBonusInr: { type: Number, default: 0 },
    payoutAmount: { type: Number, required: true },
    sellerTierAtOrder: {
      type: String,
      enum: ["STANDARD", "GOLD", "DIAMOND"],
      default: "STANDARD",
    },
    payoutMethod: {
      type: String,
      enum: ["UPI", "BANK", "CRYPTO"],
      required: true,
    },
    payoutDetails: { type: String, default: "" },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "PENDING",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    staffNote: { type: String, default: "" },
    adminNote: { type: String, default: "" },
    /** UPI ref / bank txn id / crypto tx */
    payoutReference: { type: String, default: "" },
    publicSummary: { type: String, default: "" },
    receivedAt: { type: Date },
    paidAt: { type: Date },
    holdAt: { type: Date },
    completedAt: { type: Date },
    /** When the seller must have staff pickup / still PENDING — auto-cancel after this. */
    autoCancelAt: { type: Date, default: null },
    /** Shown to seller when not empty (ops / dispute). */
    publicStaffNote: { type: String, default: "" },
    /** Evidence image URLs (order thread uploads or admin). */
    evidenceUrls: { type: [String], default: [] },
    /** Full-line quantity; may differ when partially fulfilled. */
    fulfilledQuantity: { type: Number, default: null },
    /** Snapshot of line payout at creation (INR) for partial adjustments. */
    originalPayoutInr: { type: Number, default: null },
    /** User-facing or system reason (e.g. auto_expired). */
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ assignedTo: 1 });
orderSchema.index({ status: 1, autoCancelAt: 1 });
orderSchema.index({ itemSlug: 1, status: 1, createdAt: -1 });

export const Order = models.Order || model("Order", orderSchema);
export { ORDER_STATUSES };
export type OrderStatus = (typeof ORDER_STATUSES)[number];
