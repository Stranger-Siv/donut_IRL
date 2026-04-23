import { Order } from "@/models/Order.model";

export type CapacityMap = Record<string, number>;

function capForSlug(map: CapacityMap | null | undefined, slug: string): number | null {
  if (!map || typeof map !== "object") return null;
  const m = map as CapacityMap;
  if (typeof m[slug] === "number" && m[slug] >= 0) return m[slug];
  if (typeof m._default === "number" && m._default >= 0) return m._default;
  return null;
}

/**
 * Count non-terminal orders for this item in the last 24h (rolling).
 */
export async function countRolling24hOpenForItem(itemSlug: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return Order.countDocuments({
    itemSlug,
    createdAt: { $gte: since },
    status: { $in: ["PENDING", "ASSIGNED", "RECEIVED", "PAID", "HOLD", "REVIEW"] },
  });
}

export async function checkItemCapacity(
  itemSlug: string,
  itemDailyCapacity: CapacityMap | null | undefined
): Promise<{ ok: true } | { ok: false; message: string }> {
  const cap = capForSlug(itemDailyCapacity, itemSlug);
  if (cap == null) return { ok: true };
  const n = await countRolling24hOpenForItem(itemSlug);
  if (n >= cap) {
    return {
      ok: false,
      message: `This item is at today’s intake limit (${cap} open orders / 24h). Try again later or contact support.`,
    };
  }
  return { ok: true };
}
