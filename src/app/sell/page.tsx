import { Suspense } from "react";
import { SellClient } from "./sell-client";
import { SellPageSkeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Sell",
  description: "Calculator and order flow: choose an item, quantity, and payout method.",
};

function SellFallback() {
  return <SellPageSkeleton />;
}

export default function SellPage() {
  return (
    <Suspense fallback={<SellFallback />}>
      <SellClient />
    </Suspense>
  );
}
