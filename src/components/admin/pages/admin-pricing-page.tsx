"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminPageHeader, TableShell } from "../ui";
import { cn } from "@/lib/utils";

type Price = {
  _id: string;
  itemName: string;
  itemSlug: string;
  currentPrice: number;
  sellPrice?: number;
  unitLabel: string;
  kind: string;
  active: boolean;
  equivalentMPerUnit?: number;
  updatedAt?: string;
};

type Tier = { standardRate: number; goldRate: number; diamondRate: number };

type Settings = { globalPricingPaused?: boolean; emergencyPause?: boolean };

type MinOrder = { minSellQuantityM: number; minSellItemUnits: number };

export function AdminPricingPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [tier, setTier] = useState<Tier | null>(null);
  const [setg, setSetg] = useState<Settings | null>(null);
  const [minOrder, setMinOrder] = useState<MinOrder>({
    minSellQuantityM: 1,
    minSellItemUnits: 1,
  });
  const [bulk, setBulk] = useState("2");
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState(0);

  const load = useCallback(async () => {
    const [p, t, s] = await Promise.all([
      fetch("/api/admin/prices"),
      fetch("/api/admin/rate-tiers"),
      fetch("/api/admin/settings"),
    ]);
    if (p.ok) setPrices((await p.json()) as Price[]);
    if (t.ok) setTier((await t.json()) as Tier);
    if (s.ok) {
      const j = (await s.json()) as {
        globalPricingPaused?: boolean;
        emergencyPause?: boolean;
        minSellQuantityM?: number;
        minSellItemUnits?: number;
      };
      setSetg({ globalPricingPaused: j.globalPricingPaused, emergencyPause: j.emergencyPause });
      setMinOrder({
        minSellQuantityM: j.minSellQuantityM ?? 1,
        minSellItemUnits: j.minSellItemUnits ?? 1,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasMoney = prices.some(
    (p) => p.kind === "CURRENCY" || p.itemSlug === "1m" || p.itemSlug === "1-m"
  );

  async function savePrice(id: string, currentPrice: number) {
    const r = await fetch("/api/admin/prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, currentPrice }),
    });
    if (!r.ok) toast.error("Save failed");
    else {
      toast.success("Saved");
      void load();
    }
  }

  async function saveTiers() {
    if (!tier) return;
    const r = await fetch("/api/admin/rate-tiers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tier),
    });
    if (!r.ok) toast.error("Failed");
    else {
      toast.success("Tier M rates updated");
      void load();
    }
  }

  async function toggle(id: string, active: boolean) {
    const r = await fetch("/api/admin/prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, active: !active }),
    });
    if (r.ok) {
      toast.success("Updated");
      void load();
    }
  }

  async function bulkUpdate() {
    const pct = parseFloat(bulk);
    if (Number.isNaN(pct)) return;
    const r = await fetch("/api/admin/prices/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent: pct }),
    });
    if (!r.ok) toast.error("Bulk failed");
    else {
      const j = await r.json();
      toast.success(`Updated ${j.updated} rows`);
      void load();
    }
  }

  async function pause() {
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ globalPricingPaused: !setg?.globalPricingPaused }),
    });
    if (r.ok) {
      toast.success("Settings saved");
      void load();
    }
  }

  async function saveMinOrder() {
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minSellQuantityM: minOrder.minSellQuantityM,
        minSellItemUnits: minOrder.minSellItemUnits,
      }),
    });
    if (!r.ok) toast.error("Could not save minimums");
    else {
      toast.success("Minimum order rules saved");
      void load();
    }
  }

  async function addItem() {
    if (!addName.trim()) {
      toast.error("Enter a display name");
      return;
    }
    if (hasMoney) {
      toast.error("1M money line already exists");
      return;
    }
    const r = await fetch("/api/admin/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        line: "MONEY_1M" as const,
        itemName: addName.trim(),
        currentPrice: Number.isFinite(addPrice) ? addPrice : 0,
      }),
    });
    const body = (await r.json().catch(() => ({}))) as { error?: string; itemSlug?: string };
    if (!r.ok) {
      toast.error(body.error || "Could not add line");
      return;
    }
    toast.success(body.itemSlug ? `Added (${body.itemSlug})` : "Added");
    setAddName("");
    setAddPrice(0);
    void load();
  }

  return (
    <div className="min-w-0 max-w-full">
      <AdminPageHeader
        title="Live pricing"
        desc="We only buy 1M in-game money. Set tier ₹/1M, reference Diamond rate, and minimum order size."
      />

      <div className="card-glow mb-6 w-full min-w-0 max-w-full border-amber-500/20 sm:max-w-3xl">
        <p className="text-sm font-semibold text-amber-100/95">Minimum order (sell page)</p>
        <p className="mt-1 text-xs text-zinc-500">
          Sellers cannot place an order below these. Applies to the public sell flow and the orders API.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs text-zinc-500 sm:flex-initial">
            In-game money — minimum × 1M
            <input
              type="number"
              min={0.0001}
              step="any"
              className="mt-1 block w-full max-w-full rounded border border-white/10 bg-zinc-950 px-2 py-2 text-base sm:w-32 sm:py-1.5 sm:text-sm"
              value={minOrder.minSellQuantityM}
              onChange={(e) =>
                setMinOrder((m) => ({
                  ...m,
                  minSellQuantityM: parseFloat(e.target.value) || 0,
                }))
              }
            />
            <span className="mt-0.5 block text-[10px] text-zinc-600">
              e.g. 1 = at least 1M; 5 = 5× 1M
            </span>
          </label>
          <button
            type="button"
            onClick={() => void saveMinOrder()}
            className="w-full min-h-11 shrink-0 rounded-lg bg-amber-600/90 px-4 py-2.5 text-sm text-white hover:bg-amber-500 sm:w-auto sm:min-h-0 sm:py-2"
          >
            Save minimums
          </button>
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">
          Same fields also appear under{" "}
          <Link href="/admin/settings" className="text-violet-400 hover:underline">
            Settings
          </Link>{" "}
          with other platform options.
        </p>
      </div>

      <div className="mb-6 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="card-glow min-w-0 max-w-full">
          <p className="text-sm font-medium text-zinc-200">INR per 1M in-game money (by seller tier)</p>
          <p className="mt-1 break-words text-xs leading-relaxed text-zinc-500">
            Standard / Gold / Diamond: sellers earn these ₹/1M on <strong className="text-zinc-400">money</strong>{" "}
            orders. When you <strong className="text-zinc-400">save the 1M money catalog price</strong> (or bulk % on
            money), Diamond matches that line and <strong className="text-zinc-400">Standard and Gold move with
            it</strong> (₹0.20 and ₹0.10 below Diamond). Edits below apply until the next 1M catalog save, which
            realigns Standard/Gold to those gaps again.
          </p>
          {tier && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              {(
                [
                  ["standardRate", "Standard seller"],
                  ["goldRate", "Gold seller"],
                  ["diamondRate", "Diamond seller"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="min-w-0 text-xs text-zinc-500 sm:shrink-0">
                  {label} — ₹ / 1M
                  <input
                    type="number"
                    step="0.01"
                    className="mt-0.5 block w-full min-w-0 max-w-full rounded border border-white/10 bg-zinc-950 px-2 py-2 text-base sm:max-w-[7rem] sm:py-1.5 sm:text-sm"
                    value={tier[k]}
                    onChange={(e) =>
                      setTier((t) => (t ? { ...t, [k]: parseFloat(e.target.value) } : t))
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={() => void saveTiers()}
                className="w-full min-h-11 rounded-lg bg-amber-600/80 px-3 py-2.5 text-sm sm:w-auto sm:min-h-0 sm:py-1.5"
              >
                Save
              </button>
            </div>
          )}
        </div>
        <div className="card-glow min-w-0 max-w-full space-y-3">
          <p className="text-sm font-medium text-zinc-200">Global controls</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void pause()}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-200"
            >
              {setg?.globalPricingPaused ? "Resume pricing" : "Pause all public pricing"}
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Scheduled price changes: planned — use exports + change control for now.
          </p>
        </div>
      </div>

      <div className="mb-6 card-glow">
        <p className="text-sm font-medium text-zinc-200">Bulk % update</p>
        <p className="mt-1 text-xs text-zinc-500">Adjusts the 1M money reference (Diamond ₹/1M) and synced tier rates.</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <input
            className="w-24 rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            aria-label="Percent change"
          />
          <button
            type="button"
            onClick={() => void bulkUpdate()}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm"
          >
            Apply bulk
          </button>
        </div>
      </div>

      <div className="card-glow mb-4 w-full min-w-0 max-w-full sm:max-w-3xl">
        <p className="text-sm font-medium text-zinc-200">Add catalog line</p>
        {hasMoney ? (
          <p className="mt-2 text-sm text-zinc-400">The 1M money line is in the table below.</p>
        ) : (
        <>
        <p className="mt-1 text-xs text-zinc-500">Internal ID: <code className="text-violet-300/80">1m</code> for 1M in-game money.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Display name
            <input
              placeholder="e.g. 1M in-game money"
              className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-2 text-sm"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-zinc-500">
            Diamond reference ₹/1M (Standard & Gold follow tier settings)
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full max-w-md rounded border border-white/10 bg-zinc-950 px-2 py-2 text-sm"
              value={addPrice}
              onChange={(e) => setAddPrice(parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void addItem()}
          disabled={hasMoney}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add to catalog
        </button>
        </>
        )}
      </div>

      <TableShell>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs text-zinc-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Kind</th>
              <th className="p-3">₹ (ref. / fixed)</th>
              <th className="p-3">M per unit</th>
              <th className="p-3">Internal ID</th>
              <th className="p-3">Active</th>
              <th className="p-3">Save</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p._id} className="border-t border-white/5">
                <td className="p-2 text-zinc-200">{p.itemName}</td>
                <td className="p-2 text-xs">Money (1M)</td>
                <td className="p-2">
                  <input
                    type="number"
                    className="w-24 rounded border border-white/10 bg-zinc-950 px-1.5 py-1 font-mono text-xs"
                    defaultValue={p.currentPrice}
                    id={`pr-${p._id}`}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (v === p.currentPrice) return;
                    }}
                  />
                </td>
                <td className="p-2 font-mono text-xs text-zinc-500">
                  {p.equivalentMPerUnit ?? "—"}
                </td>
                <td className="p-2 font-mono text-[10px] text-zinc-500" title="Same as &quot;slug&quot; in code">
                  {p.itemSlug}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => void toggle(p._id, p.active)}
                    className={cn("text-xs", p.active ? "text-emerald-400" : "text-zinc-500")}
                  >
                    {p.active ? "on" : "off"}
                  </button>
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`pr-${p._id}`) as HTMLInputElement;
                      if (el) void savePrice(p._id, parseFloat(el.value));
                    }}
                    className="text-xs text-violet-300 hover:underline"
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
