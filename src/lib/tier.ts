import {
  VOLUME_M_DIAMOND,
  VOLUME_M_GOLD,
  type SellerTierName,
} from "./constants";

const TIER_RANK: Record<SellerTierName, number> = {
  STANDARD: 0,
  GOLD: 1,
  DIAMOND: 2,
};

/** Normalize DB/session strings to a valid tier. */
export function normalizeSellerTier(raw: string | null | undefined): SellerTierName {
  const t = String(raw ?? "STANDARD")
    .trim()
    .toUpperCase();
  if (t === "GOLD" || t === "DIAMOND" || t === "STANDARD") {
    return t;
  }
  return "STANDARD";
}

/** Pick the higher of two tiers (for pricing: volume-based vs stored must not leave you on Standard when volume qualifies for Gold). */
export function higherSellerTier(a: SellerTierName, b: SellerTierName): SellerTierName {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

export function sellerTierFromVolumeM(volumeM: number): SellerTierName {
  if (volumeM >= VOLUME_M_DIAMOND) return "DIAMOND";
  if (volumeM >= VOLUME_M_GOLD) return "GOLD";
  return "STANDARD";
}

export function nextTierProgress(
  volumeM: number
): { current: SellerTierName; next: SellerTierName | null; needM: number } {
  const current = sellerTierFromVolumeM(volumeM);
  if (current === "STANDARD") {
    return { current, next: "GOLD", needM: Math.max(0, VOLUME_M_GOLD - volumeM) };
  }
  if (current === "GOLD") {
    return { current, next: "DIAMOND", needM: Math.max(0, VOLUME_M_DIAMOND - volumeM) };
  }
  return { current, next: null, needM: 0 };
}
