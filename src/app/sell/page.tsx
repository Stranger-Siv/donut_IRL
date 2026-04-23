import { Suspense } from "react";
import { SellClient } from "./sell-client";

export const metadata = {
  title: "Sell",
  description: "Calculator and order flow: choose an item, quantity, and payout method.",
};

function SellFallback() {
  return <p className="text-sm text-zinc-500">Loading…</p>;
}

export default function SellPage() {
  return (
    <Suspense fallback={<SellFallback />}>
      <SellClient />
    </Suspense>
  );
}
