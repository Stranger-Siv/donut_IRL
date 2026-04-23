/** Non-binding reference rates: INR per 1 unit of foreign currency. */

export function inrToApproxUsd(inr: number, usdPerInr: number): number {
  if (!Number.isFinite(inr) || !Number.isFinite(usdPerInr) || usdPerInr <= 0) return 0;
  return Math.round((inr / usdPerInr) * 100) / 100;
}

export function inrToApproxEur(inr: number, eurPerInr: number): number {
  if (!Number.isFinite(inr) || !Number.isFinite(eurPerInr) || eurPerInr <= 0) return 0;
  return Math.round((inr / eurPerInr) * 100) / 100;
}

/** displayFxUsdInr = how many INR for 1 USD → INR/USD for conversion to USD amount = inr / rate */
export function fxPartsFromSettings(s: {
  displayFxUsdInr?: number;
  displayFxEurInr?: number;
}) {
  const usd = s.displayFxUsdInr ?? 83;
  const eur = s.displayFxEurInr ?? 90;
  return { inrPerUsd: usd, inrPerEur: eur };
}
