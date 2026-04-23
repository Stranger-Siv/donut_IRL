import { Order } from "@/models/Order.model";

/** JSON shape for GET /api/orders/:id and SSE `order` events. */
export function toOrderResponse(o: InstanceType<typeof Order>) {
  const fq = (o as { fulfilledQuantity?: number | null }).fulfilledQuantity;
  return {
    _id: o._id.toString(),
    userId: o.userId.toString(),
    itemName: o.itemName,
    itemSlug: o.itemSlug,
    quantity: o.quantity,
    /** Effective fulfilled units (partial line). */
    fulfilledQuantity: typeof fq === "number" ? fq : o.quantity,
    unitPrice: o.unitPrice,
    basePayoutInr: o.basePayoutInr,
    tierBonusInr: o.tierBonusInr,
    equivalentVolume: o.equivalentVolume,
    sellerTierAtOrder: o.sellerTierAtOrder,
    payoutAmount: o.payoutAmount,
    originalPayoutInr: (o as { originalPayoutInr?: number | null }).originalPayoutInr ?? o.payoutAmount,
    payoutMethod: o.payoutMethod,
    payoutDetails: o.payoutDetails,
    status: o.status,
    assignedTo: o.assignedTo?.toString() ?? null,
    staffNote: o.staffNote,
    adminNote: o.adminNote,
    publicStaffNote: (o as { publicStaffNote?: string }).publicStaffNote ?? "",
    evidenceUrls: ((o as { evidenceUrls?: string[] }).evidenceUrls ?? []) as string[],
    cancelReason: (o as { cancelReason?: string }).cancelReason ?? "",
    autoCancelAt: (o as { autoCancelAt?: Date | null }).autoCancelAt ?? null,
    createdAt: o.createdAt,
    receivedAt: o.receivedAt,
    paidAt: o.paidAt,
    holdAt: o.holdAt,
    completedAt: o.completedAt,
    payoutReference: o.payoutReference,
  };
}

export type OrderResponse = ReturnType<typeof toOrderResponse>;

/** Optional extras on GET /api/orders/:id (queue & SLA; not in SSE snapshot). */
export type OrderViewExtras = {
  queuePosition?: number | null;
  isBusinessOpen?: boolean;
  processingHint?: string;
};

export type OrderViewResponse = OrderResponse & OrderViewExtras;
