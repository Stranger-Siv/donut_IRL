"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Coins, Minus, Plus, Sparkles } from "lucide-react";
import { useSellStore, estimatePayout, minQuantityForSelection } from "@/store/sell-calc";
import { cn, formatInrDecimal } from "@/lib/utils";

function RateHint({
  item,
  userTier,
  tierRates,
}: {
  item: { kind: string; currentPrice: number; itemName: string };
  userTier: string | null;
  tierRates: { STANDARD: number; GOLD: number; DIAMOND: number } | null;
}) {
  const t = (userTier || "STANDARD") as "STANDARD" | "GOLD" | "DIAMOND";
  if (item.kind === "CURRENCY" && tierRates) {
    return (
      <p className="mt-1 text-xs text-zinc-500">
        Your rate:{" "}
        <span className="font-mono text-violet-300/90">{formatInrDecimal(tierRates[t])}</span> / 1M
        {!userTier && " (Standard, guest)"}
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-zinc-500">
      We pay:{" "}
      <span className="font-mono text-cyan-300/90">{formatInrDecimal(item.currentPrice)}</span> each
    </p>
  );
}

export function SellItemCatalog() {
  const {
    items,
    tierRates,
    itemSlug,
    setItemSlug,
    quantity,
    setQuantity,
    userSellerTier,
    minSellQuantityM,
    minSellItemUnits,
  } = useSellStore();

  const money = useMemo(() => items.filter((i) => i.kind === "CURRENCY"), [items]);

  const estimate = useMemo(
    () =>
      estimatePayout({
        itemSlug,
        quantity,
        items,
        tierRates,
        userSellerTier,
      }),
    [itemSlug, quantity, items, tierRates, userSellerTier]
  );

  const selected = items.find((i) => i.itemSlug === itemSlug) ?? null;

  const minQ = useMemo(
    () =>
      minQuantityForSelection(selected, {
        minSellQuantityM,
        minSellItemUnits,
      }),
    [selected, minSellQuantityM, minSellItemUnits]
  );

  const belowMinimum =
    selected != null &&
    (!Number.isFinite(quantity) || quantity <= 0 || quantity < minQ);

  /** Text field is separate from store so “0” can be fully cleared while typing. */
  const [qtyInput, setQtyInput] = useState("");
  const lastSlugForInput = useRef<string | null>(null);
  useEffect(() => {
    if (itemSlug === lastSlugForInput.current) return;
    lastSlugForInput.current = itemSlug;
    if (itemSlug) {
      setQtyInput(String(useSellStore.getState().quantity));
    } else {
      setQtyInput("");
    }
  }, [itemSlug]);

  function select(slug: string) {
    const nextItem = items.find((i) => i.itemSlug === slug) ?? null;
    const m = minQuantityForSelection(nextItem, {
      minSellQuantityM,
      minSellItemUnits,
    });
    setItemSlug(slug);
    if (slug !== itemSlug) {
      setQuantity(m);
    }
  }

  function step(delta: number) {
    const next = Math.max(0, round4(quantity + delta));
    setQuantity(next);
    setQtyInput(String(next));
  }

  function applyQtyString(raw: string) {
    setQtyInput(raw);
    if (raw === "" || raw === "-") {
      setQuantity(0);
      return;
    }
    const n = parseFloat(raw);
    if (Number.isFinite(n)) {
      setQuantity(Math.max(0, n));
    }
  }

  const qtyLabel = selected?.kind === "CURRENCY" ? "Millions (1M) you’re selling" : "How many";

  return (
    <div className="space-y-6">
      {tierRates && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span>Tier rates (1M):</span>
          {(["STANDARD", "GOLD", "DIAMOND"] as const).map((k) => (
            <span key={k} className="rounded border border-white/10 bg-zinc-900/50 px-2 py-0.5 font-mono text-zinc-300">
              {k} {formatInrDecimal(tierRates[k])}
            </span>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
          Catalog is empty or offline. In admin <strong>Live pricing</strong>, add the 1M money line, or check the
          database connection.
        </p>
      ) : (
        <>
          {money.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">What we buy</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {money.map((p) => (
                  <button
                    key={p.itemSlug}
                    type="button"
                    onClick={() => select(p.itemSlug)}
                    className={cn(
                      "rounded-2xl border p-4 text-left outline-none transition",
                      "hover:border-violet-500/40 hover:bg-violet-500/5",
                      "focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                      itemSlug === p.itemSlug
                        ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
                        : "border-white/10 bg-zinc-900/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-content-center rounded-xl bg-amber-500/15 text-amber-200">
                        <Coins className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-100">{p.itemName}</p>
                        <RateHint
                          item={p}
                          userTier={userSellerTier}
                          tierRates={tierRates}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          <div
            className={cn(
              "flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between",
              belowMinimum
                ? "bg-rose-500/[0.04] ring-1 ring-rose-500/25"
                : "ring-1 ring-white/[0.06]"
            )}
          >
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">{qtyLabel}</p>
              {selected.kind === "CURRENCY" && (
                <p className="text-[10px] text-zinc-600">Example: 10 = 10× 1M = 10M total.</p>
              )}
              <p className="text-[10px] text-zinc-500">
                Minimum order:{" "}
                {selected.kind === "CURRENCY" ? (
                  <span className="font-mono text-zinc-400">{minQ}× 1M</span>
                ) : (
                  <span className="font-mono text-zinc-400">{minQ}</span>
                )}{" "}
                <span className="text-zinc-600">(Admin → Settings)</span>
              </p>
            </div>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => step(-1)}
                className="grid h-10 w-10 place-content-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                aria-invalid={belowMinimum}
                className={cn(
                  "h-10 w-24 rounded-lg border bg-zinc-950 px-1 py-2 text-center font-mono text-sm text-zinc-100 transition",
                  "placeholder:text-zinc-600",
                  "focus:outline-none focus:ring-2",
                  belowMinimum
                    ? "border-rose-500/40 focus:ring-rose-500/35"
                    : "border-white/10 focus:ring-violet-500/40"
                )}
                value={qtyInput}
                onChange={(e) => applyQtyString(e.target.value)}
                onBlur={() => {
                  if (qtyInput.trim() === "" || qtyInput.trim() === "-") {
                    setQuantity(0);
                    setQtyInput("");
                    return;
                  }
                  const n = parseFloat(qtyInput);
                  if (!Number.isFinite(n) || n < 0) {
                    setQuantity(0);
                    setQtyInput("");
                    return;
                  }
                  setQuantity(n);
                  setQtyInput(String(n));
                }}
              />
              <button
                type="button"
                onClick={() => step(1)}
                className="grid h-10 w-10 place-content-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {belowMinimum && (
            <div className="flex gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-100/90">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-400/90"
                aria-hidden
              />
              <p>
                Enter at least{" "}
                {selected.kind === "CURRENCY" ? (
                  <span className="font-mono text-rose-100">{minQ}× 1M</span>
                ) : (
                  <span className="font-mono text-rose-100">{minQ}</span>
                )}{" "}
                to continue. You can clear the field and type a new amount.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs text-zinc-500">You&apos;ll receive (estimate)</p>
            <p
              className={cn(
                "mt-1 font-mono text-2xl sm:text-3xl",
                belowMinimum ? "text-zinc-500" : "text-violet-200"
              )}
            >
              {belowMinimum ? "—" : formatInrDecimal(estimate)}
            </p>
            {belowMinimum && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Estimate shows once the amount meets the minimum.
              </p>
            )}
            <p className="mt-1 text-[11px] text-zinc-500">
              {userSellerTier
                ? `Based on your ${userSellerTier} tier.`
                : "Guest: Standard tier. Log in to use your real tier after signup."}
            </p>
          </div>
        </div>
      )}

      {!itemSlug && items.length > 0 && (
        <p className="text-center text-sm text-zinc-500">Tap a card above to choose what to sell.</p>
      )}
    </div>
  );
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
