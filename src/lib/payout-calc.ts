import type { TierRates } from "./rate-settings";
import { rateForTier } from "./rate-settings";
import { sellerTierFromVolumeM } from "./tier";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type PriceLike = {
  itemSlug: string;
  kind: "CURRENCY";
  currentPrice: number;
  equivalentMPerUnit?: number;
};

/**
 * Tier for this order = tier from lifetime volume **before** this trade (at submit time).
 */
export function computeOrderAmounts(
  lifetimeVolumeM: number,
  rates: TierRates,
  price: PriceLike,
  quantity: number
) {
  const sellerTierAtOrder = sellerTierFromVolumeM(lifetimeVolumeM);
  const perM = rateForTier(rates, sellerTierAtOrder as "STANDARD" | "GOLD" | "DIAMOND");

  const payoutAmount = round2(quantity * perM);
  return {
    payoutAmount,
    equivalentVolume: quantity,
    unitPrice: perM,
    basePayoutInr: payoutAmount,
    tierBonusInr: 0,
    sellerTierAtOrder,
  };
}

export { round2 };
