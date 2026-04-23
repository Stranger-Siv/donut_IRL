import { type ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { formatInr } from "@/lib/utils";

type TierRates = { STANDARD: number; GOLD: number; DIAMOND: number };
type ItemRow = {
  itemName: string;
  itemSlug: string;
  unitLabel: string;
  currentPrice: number;
  kind?: string;
};

export function LiveRatesBoard({
  tierRates,
  items,
  title = "What we buy (today)",
}: {
  tierRates: TierRates;
  items: ItemRow[];
  title?: string;
}) {
  return (
    <section className="space-y-4" aria-label="Current buy prices">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-300 sm:text-base">{title}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400/90">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {(["STANDARD", "GOLD", "DIAMOND"] as const).map((k) => (
          <div
            key={k}
            className="card-glow flex flex-col gap-0.5 border border-white/10 py-2 text-xs sm:text-sm"
          >
            <span className="text-zinc-500">{k}</span>
            <span className="font-mono text-violet-200">₹{tierRates[k]}/M</span>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.length === 0 && (
          <p className="text-sm text-zinc-500">Rates loading… check back in a moment.</p>
        )}
        {items.map((p) => (
          <div
            key={p.itemSlug}
            className="card-glow flex items-center justify-between gap-2 transition hover:border-violet-500/30"
          >
            <div>
              <p className="text-sm font-medium text-zinc-100">{p.itemName}</p>
              <p className="text-xs text-zinc-500">{p.unitLabel}</p>
              {p.kind === "CURRENCY" && (
                <p className="text-[10px] text-zinc-600">Uses tier rate / M</p>
              )}
            </div>
            <p className="font-mono text-sm font-medium text-violet-200">
              {p.kind === "CURRENCY" ? "—" : formatInr(p.currentPrice)}
            </p>
            <TrendingUp className="h-4 w-4 text-zinc-600" aria-hidden />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ratesFallback(): ReactNode {
  return (
    <div className="space-y-2">
      {["1M in-game money"].map((n) => (
        <div key={n} className="h-14 rounded-2xl bg-zinc-800/30 animate-pulse" />
      ))}
    </div>
  );
}
