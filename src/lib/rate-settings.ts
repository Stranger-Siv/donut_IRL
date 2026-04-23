import { connectDB } from "./mongodb";
import { RateSettings } from "@/models/RateSettings.model";

const DEFAULTS = { standardRate: 1.8, goldRate: 1.9, diamondRate: 2.0 };

/** When the 1M money (diamond reference) price moves, lower tiers track these gaps in INR. */
export const MONEY_TIER_STANDARD_BELOW_DIAMOND = 0.2;
export const MONEY_TIER_GOLD_BELOW_DIAMOND = 0.1;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Sets `diamondRate` to `newDiamond` and updates standard/gold so they stay in step
 * with the reference 1M money line (admin table / bulk % on money).
 */
export function syncTierRatesToMoneyDiamond(
  r: { standardRate: number; goldRate: number; diamondRate: number },
  newDiamond: number
) {
  const d = round2(newDiamond);
  r.diamondRate = d;
  r.goldRate = round2(Math.max(0, d - MONEY_TIER_GOLD_BELOW_DIAMOND));
  r.standardRate = round2(Math.max(0, d - MONEY_TIER_STANDARD_BELOW_DIAMOND));
}

export type TierRates = {
  standardRate: number;
  goldRate: number;
  diamondRate: number;
};

export async function getTierRates(): Promise<TierRates> {
  await connectDB();
  let doc = await RateSettings.findById("global");
  if (!doc) {
    doc = await RateSettings.create({ _id: "global", ...DEFAULTS });
  }
  return {
    standardRate: doc.standardRate,
    goldRate: doc.goldRate,
    diamondRate: doc.diamondRate,
  };
}

export function rateForTier(
  r: TierRates,
  sellerTier: "STANDARD" | "GOLD" | "DIAMOND"
) {
  if (sellerTier === "DIAMOND") return r.diamondRate;
  if (sellerTier === "GOLD") return r.goldRate;
  return r.standardRate;
}
