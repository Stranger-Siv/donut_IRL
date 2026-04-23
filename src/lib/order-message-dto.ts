import type { OrderMessageAuthorRole } from "@/models/OrderMessage.model";

export type OrderMessageResponse = {
  _id: string;
  orderId: string;
  userId: string;
  authorName: string;
  authorRole: OrderMessageAuthorRole;
  body: string;
  attachmentUrls: string[];
  createdAt: string;
};
