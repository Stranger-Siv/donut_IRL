"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatInr } from "@/lib/utils";
import { toast } from "sonner";
import { Wallet, ArrowLeft } from "lucide-react";

type WalletData = {
  totalCompletedInr: number;
  pendingPayoutInr: number;
  recentCompleted: { _id: string; itemName: string; payoutAmount: number; completedAt: string }[];
};

export function WalletPageClient() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/user/wallet", { cache: "no-store", credentials: "include" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Could not load wallet");
      }
      setData((await r.json()) as WalletData);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }
  if (!data) {
    return (
      <p className="text-sm text-zinc-500">
        Could not load wallet.{" "}
        <Link href="/dashboard" className="text-violet-400 hover:underline">
          Back to dashboard
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1 text-sm text-violet-400 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2 text-violet-300">
          <Wallet className="h-5 w-5" />
          <h1 className="text-2xl font-semibold text-zinc-100">Payouts &amp; balance</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Lifetime completed payouts, exposure from open orders, and recent history.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-glow">
          <p className="text-xs text-zinc-500">Total completed (INR, lifetime)</p>
          <p className="mt-1 font-mono text-2xl text-emerald-200/90">{formatInr(data.totalCompletedInr)}</p>
        </div>
        <div className="card-glow">
          <p className="text-xs text-zinc-500">In-progress orders (sum of quoted payouts)</p>
          <p className="mt-1 font-mono text-2xl text-amber-200/90">{formatInr(data.pendingPayoutInr)}</p>
        </div>
      </div>

      <div className="card-glow">
        <h2 className="text-sm font-medium text-zinc-200">Recent completed</h2>
        <p className="text-xs text-zinc-500">Last 20 — tap a row to open the order (if you still have access).</p>
        {data.recentCompleted.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No completed orders yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {data.recentCompleted.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <Link href={`/orders/${row._id}`} className="font-medium text-violet-300 hover:underline">
                    {row.itemName}
                  </Link>
                  <p className="text-[10px] text-zinc-600">
                    {row.completedAt
                      ? new Date(row.completedAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <span className="font-mono text-zinc-200">{formatInr(row.payoutAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
