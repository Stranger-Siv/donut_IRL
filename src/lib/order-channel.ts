import type { OrderMessageResponse } from "./order-message-dto";
import type { OrderResponse } from "./order-response";

/**
 * In-process pub/sub for order updates. Works for `next start` and dev on one
 * server process. If you run multiple Node instances, add Redis pub/sub and
 * publish from the same place we call `orderChannelPub`.
 */
export type OrderChannelEvent =
  | { type: "order"; order: OrderResponse }
  | { type: "message"; message: OrderMessageResponse };

const channels = new Map<string, Set<(e: OrderChannelEvent) => void>>();

export function orderChannelSub(
  orderId: string,
  fn: (e: OrderChannelEvent) => void
) {
  let set = channels.get(orderId);
  if (!set) {
    set = new Set();
    channels.set(orderId, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) {
      channels.delete(orderId);
    }
  };
}

export function orderChannelPub(orderId: string, payload: OrderChannelEvent) {
  const set = channels.get(orderId);
  if (!set) return;
  set.forEach((fn) => {
    try {
      fn(payload);
    } catch (e) {
      console.error("[order-channel] listener", e);
    }
  });
}
