import type { Types } from "mongoose";

export function canReadOrder(
  o: { userId: Types.ObjectId; assignedTo?: Types.ObjectId | null },
  userId: string,
  role: string
) {
  if (role === "ADMIN") return true;
  if (o.userId.toString() === userId) return true;
  if (role === "STAFF" && o.assignedTo && o.assignedTo.toString() === userId) {
    return true;
  }
  return false;
}

/**
 * Seller, assigned middleman, or admin — unless the order is finished (no new messages
 * after completion; keeps support/history in read-only).
 */
export function canPostOrderMessage(
  o: {
    userId: Types.ObjectId;
    assignedTo?: Types.ObjectId | null;
    status?: string;
  },
  userId: string,
  role: string
) {
  if (o.status === "COMPLETED") {
    return false;
  }
  if (role === "ADMIN") return true;
  if (o.userId.toString() === userId) return true;
  if (role === "STAFF" && o.assignedTo && o.assignedTo.toString() === userId) {
    return true;
  }
  return false;
}
