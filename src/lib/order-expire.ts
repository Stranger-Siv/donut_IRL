import { Order } from "@/models/Order.model";
import { orderChannelPub } from "./order-channel";
import { toOrderResponse } from "./order-response";
import { connectDB } from "./mongodb";

/**
 * PENDING orders past `autoCancelAt` are cancelled. Returns true if mutated.
 * Caller must re-fetch if other logic depends on order state.
 */
export async function tryAutoCancelIfExpired(
  o: Parameters<typeof toOrderResponse>[0]
): Promise<boolean> {
  if (o.status !== "PENDING" || !o.autoCancelAt) return false;
  if (o.autoCancelAt.getTime() > Date.now()) return false;
  o.status = "CANCELLED";
  o.cancelReason = o.cancelReason || "auto_expired";
  o.autoCancelAt = null;
  await o.save();
  orderChannelPub(o._id.toString(), { type: "order", order: toOrderResponse(o) });
  return true;
}

/** Batch job: expire any stale PENDING orders (cron or maintenance). */
export async function runExpireAllPendingOverdue(): Promise<number> {
  await connectDB();
  const now = new Date();
  const stale = await Order.find({
    status: "PENDING",
    autoCancelAt: { $lte: now },
  }).limit(200);
  let n = 0;
  for (const o of stale) {
    const ok = await tryAutoCancelIfExpired(o);
    if (ok) n += 1;
  }
  return n;
}
