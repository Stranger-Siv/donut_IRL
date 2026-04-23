import { formatInr } from "./utils";

export function buildPublicFeedLine(
  itemSlug: string,
  itemName: string,
  quantity: number,
  payoutInr: number
): string {
  const money = formatInr(payoutInr);
  if (itemSlug === "1m" || itemSlug === "1-m") {
    return `${quantity}M sold • ${money} paid`;
  }
  const n = Math.round(quantity);
  const label = n === 1 ? itemName : `${n} ${itemName}`;
  return `${label} sold • ${money} paid`;
}
