import { create } from "zustand";
import type { AppSellerTier } from "@/types/next-auth";

export type ItemRow = {
  itemName: string;
  itemSlug: string;
  currentPrice: number;
  unitLabel: string;
  kind: "CURRENCY" | "ITEM";
  equivalentMPerUnit: number;
};

type TierRates = Record<"STANDARD" | "GOLD" | "DIAMOND", number>;

type State = {
  tierRates: TierRates | null;
  items: ItemRow[];
  setCatalog: (
    tierRates: TierRates,
    items: ItemRow[],
    minimums: { minSellQuantityM: number; minSellItemUnits: number }
  ) => void;
  minSellQuantityM: number;
  minSellItemUnits: number;
  itemSlug: string | null;
  setItemSlug: (s: string | null) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  /** Set from /api/user/me when logged in; else null → estimate as STANDARD */
  userSellerTier: AppSellerTier | null;
  setUserSellerTier: (t: AppSellerTier | null) => void;
};

export const useSellStore = create<State>((set) => ({
  tierRates: null,
  items: [],
  setCatalog: (tierRates, items, minimums) =>
    set({
      tierRates,
      items,
      minSellQuantityM: minimums.minSellQuantityM,
      minSellItemUnits: minimums.minSellItemUnits,
    }),
  minSellQuantityM: 1,
  minSellItemUnits: 1,
  itemSlug: null,
  setItemSlug: (itemSlug) => set({ itemSlug }),
  quantity: 1,
  setQuantity: (quantity) => set({ quantity }),
  userSellerTier: null,
  setUserSellerTier: (userSellerTier) => set({ userSellerTier }),
}));

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Admin minimums: 1M lots for money, units for item lines. */
export function minQuantityForSelection(
  item: ItemRow | null | undefined,
  mins: { minSellQuantityM: number; minSellItemUnits: number }
) {
  if (!item) return 1;
  return item.kind === "CURRENCY" ? mins.minSellQuantityM : mins.minSellItemUnits;
}

export function estimatePayout(
  s: {
    itemSlug: string | null;
    quantity: number;
    items: ItemRow[];
    tierRates: TierRates | null;
    userSellerTier: AppSellerTier | null;
  }
) {
  if (!s.itemSlug || !s.tierRates) return 0;
  const item = s.items.find((x) => x.itemSlug === s.itemSlug);
  if (!item || s.quantity <= 0) return 0;
  const key = s.userSellerTier || "STANDARD";
  if (item.kind === "CURRENCY") {
    return round2(s.quantity * s.tierRates[key]);
  }
  return round2(s.quantity * item.currentPrice);
}
