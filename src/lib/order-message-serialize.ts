import { Types } from "mongoose";
import type { OrderMessageResponse } from "./order-message-dto";
import type { OrderMessageAuthorRole } from "@/models/OrderMessage.model";

export type OrderMessagePopulated = {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  userId:
    | { _id: Types.ObjectId; name?: string; email?: string }
    | Types.ObjectId;
  authorRole: OrderMessageAuthorRole;
  body: string;
  attachmentUrls: string[];
  createdAt: Date;
};

export function toMessageResponse(m: OrderMessagePopulated): OrderMessageResponse {
  const u = m.userId;
  const isPop = u && typeof u === "object" && "_id" in u;
  const name = isPop
    ? (u as { name?: string; email?: string }).name ||
      (u as { name?: string; email?: string }).email ||
      "User"
    : "User";
  const userIdStr = isPop
    ? (u as { _id: Types.ObjectId })._id.toString()
    : (u as Types.ObjectId).toString();
  return {
    _id: m._id.toString(),
    orderId: m.orderId.toString(),
    userId: userIdStr,
    authorName: name,
    authorRole: m.authorRole,
    body: m.body,
    attachmentUrls: Array.isArray(m.attachmentUrls) ? m.attachmentUrls : [],
    createdAt: m.createdAt.toISOString(),
  };
}
