/**
 * Donut Exchange only buys **1M in-game money** (single catalog row).
 */

export const MONEY_SLUGS = new Set(["1m", "1-m"]);

/** Slugs we accept in orders/API for the single money line (DB usually stores `1m`). */
export const CANONICAL_MONEY_SLUG = "1m";

export type PriceLike = {
  kind?: string;
  itemSlug?: string;
  active?: boolean;
};

export function inferKind(p: PriceLike): "CURRENCY" | "ITEM" {
  if (p.kind === "CURRENCY" || p.kind === "ITEM") return p.kind;
  const s = (p.itemSlug || "").toLowerCase();
  if (MONEY_SLUGS.has(s)) return "CURRENCY";
  return "ITEM";
}

/** Rows shown on the public sell page and home rates. */
export function isPublicCatalogItem(p: PriceLike): boolean {
  const slug = (p.itemSlug || "").toLowerCase();
  const k = inferKind(p);
  return k === "CURRENCY" && MONEY_SLUGS.has(slug);
}

export function filterPublicCatalog<T extends PriceLike>(rows: T[]): T[] {
  return rows.filter((p) => isPublicCatalogItem(p));
}

export function normalizeOrderItemSlug(raw: string): string {
  const t = (raw || "").toLowerCase().trim();
  if (MONEY_SLUGS.has(t)) return CANONICAL_MONEY_SLUG;
  return t;
}

/** `itemSlug` values to query for an order (handles legacy `1-m` in DB). */
export function orderItemSlugCandidates(normalized: string): string[] {
  if (normalized === CANONICAL_MONEY_SLUG) return [CANONICAL_MONEY_SLUG, "1-m"];
  return [normalized];
}
