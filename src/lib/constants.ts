/** Lifetime volume (equivalent M) thresholds — auto seller tier */
export const VOLUME_M_GOLD = 2_000;
export const VOLUME_M_DIAMOND = 10_000;

export const SELLER_TIERS = ["STANDARD", "GOLD", "DIAMOND"] as const;
export type SellerTierName = (typeof SELLER_TIERS)[number];

/** Referred user must complete this much volume (M, completed orders) for referrer reward */
export const REFERRAL_VOLUME_THRESHOLD_M = 50;
/** In-game reward to referrer only */
export const REFERRAL_REWARD_IG = "5M";