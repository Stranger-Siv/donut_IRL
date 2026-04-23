"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { formatInr } from "@/lib/utils";
import { VOLUME_M_GOLD, VOLUME_M_DIAMOND } from "@/lib/constants";
import { Bell, Home, Link2, PlusCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardPageSkeleton } from "@/components/ui/skeleton";

type Me = {
  sellerTier: string;
  currentRatePerM: number;
  lifetimeVolumeSold: number;
  nextTier: string | null;
  needMToNext: number;
  totalSoldInr: number;
  referralCode: string;
  discordLinked?: boolean;
};

type Order = {
  _id: string;
  itemName: string;
  quantity: number;
  payoutAmount: number;
  status: string;
  createdAt: string;
};

type Ref = {
  referralCode: string;
  referredPendingCount: number;
  referredCompletedRewards: number;
  minVolumeMForReward: number;
  rewardInGame: string;
  rewardGoesTo: string;
  yourReferral: { status: string; progressVolumeM: number } | null;
};

type Noti = { _id: string; title: string; message: string; read: boolean; createdAt: string };

type Wallet = {
  totalCompletedInr: number;
  pendingPayoutInr: number;
  recentCompleted: { _id: string; itemName: string; payoutAmount: number; completedAt: string }[];
};

export function DashboardClient() {
  const { data: session } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ref, setRef] = useState<Ref | null>(null);
  const [noti, setNoti] = useState<Noti[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [alert1m, setAlert1m] = useState("");
  const [boot, setBoot] = useState(true);

  const load = useCallback(async () => {
    try {
      const [m, o, r, n, w] = await Promise.all([
        fetch("/api/user/me"),
        fetch("/api/orders"),
        fetch("/api/referrals", { cache: "no-store" }),
        fetch("/api/user/notifications"),
        fetch("/api/user/wallet"),
      ]);
      if (m.ok) setMe((await m.json()) as Me);
      if (o.ok) setOrders((await o.json()) as Order[]);
      if (r.ok) setRef((await r.json()) as Ref);
      if (n.ok) setNoti((await n.json()) as Noti[]);
      if (w.ok) setWallet((await w.json()) as Wallet);
    } finally {
      setBoot(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addAlert(itemSlug: string, target: number) {
    const res = await fetch("/api/user/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemSlug, targetPrice: target, active: true }),
    });
    if (!res.ok) {
      toast.error("Could not set alert");
      return;
    }
    toast.success("Price alert saved");
    void load();
  }

  const firstName =
    session?.user?.name?.trim()?.split(/\s+/)[0] ||
    session?.user?.email?.split("@")[0] ||
    "there";

  if (boot) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="w-full min-w-0 space-y-8 sm:space-y-10">
      <div className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-zinc-950/30 to-zinc-950/90 px-4 py-5 sm:px-8 sm:py-8">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-400/90">Your seller hub</p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Hi, {firstName}
        </h1>
        <p className="mt-1 max-w-lg text-sm text-zinc-400">
          Tier, volume, orders, and referrals in one place — this page is your account home (not the marketing site).
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-violet-500"
          >
            <PlusCircle className="h-4 w-4" />
            New sell
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-200 transition hover:border-violet-500/30"
          >
            <Home className="h-4 w-4" />
            Live rates
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-glow">
          <div className="flex items-center gap-2 text-amber-200">
            <Trophy className="h-4 w-4" />
            Seller tier
          </div>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {me?.sellerTier ?? "—"}
          </p>
          <p className="text-sm text-violet-300">
            Current 1M rate: {me ? `₹${me.currentRatePerM}/M` : "—"}
          </p>
          <p className="text-xs text-zinc-500">
            Lifetime volume: {me ? `${me.lifetimeVolumeSold}M` : "—"} eq.
            {me?.nextTier && me.needMToNext > 0 && (
              <span className="block pt-1">
                {me.needMToNext}M to {me.nextTier} (tiers: Standard &lt;{VOLUME_M_GOLD}M · Gold &lt;
                {VOLUME_M_DIAMOND}M)
              </span>
            )}
          </p>
        </div>
        <div className="card-glow">
          <p className="text-xs text-zinc-500">Total sold (payout, INR)</p>
          <p className="mt-1 font-mono text-2xl text-zinc-100">
            {me ? formatInr(me.totalSoldInr) : "—"}
          </p>
        </div>
      </div>

      {wallet && (
        <div className="card-glow space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-200">Payouts &amp; open exposure</p>
            <Link
              href="/wallet"
              className="text-xs font-medium text-violet-400 transition hover:text-violet-300 hover:underline"
            >
              View full wallet →
            </Link>
          </div>
          <p className="text-xs text-zinc-500">
            Completed (lifetime): <span className="font-mono text-zinc-200">{formatInr(wallet.totalCompletedInr)}</span>{" "}
            · In-progress orders (sum of quoted payouts):{" "}
            <span className="font-mono text-amber-200/90">{formatInr(wallet.pendingPayoutInr)}</span>
          </p>
          {wallet.recentCompleted.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-white/5 pt-2 text-xs text-zinc-500">
              {wallet.recentCompleted.slice(0, 5).map((r) => (
                <li key={r._id} className="flex justify-between gap-2">
                  <span className="truncate text-zinc-400">{r.itemName}</span>
                  <span className="shrink-0 font-mono text-zinc-300">{formatInr(r.payoutAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card-glow text-sm text-zinc-400">
        <p>
          <strong className="text-zinc-200">Discord:</strong>{" "}
          {me?.discordLinked ? "Linked (manage in a future settings page)." : "Not linked — coming soon in account settings."}
        </p>
      </div>

      <div className="card-glow">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-violet-300">
            <Link2 className="h-4 w-4" />
            Referral program
          </div>
          <Link
            href="/referrals"
            className="text-sm font-medium text-violet-400 transition hover:text-violet-300 hover:underline"
          >
            Open referrals →
          </Link>
        </div>
        {ref && (
          <p className="mt-2 text-sm text-zinc-400">
            Code <span className="font-mono text-zinc-200">{ref.referralCode}</span> · {ref.referredPendingCount}{" "}
            pending · {ref.referredCompletedRewards} rewards paid
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-600">
          Copy share links and full rules on the referrals page.
        </p>
      </div>

      <div className="card-glow space-y-3">
        <h2 className="text-sm font-medium text-zinc-200">Price alerts</h2>
        <p className="text-xs text-zinc-500">Notify when our buy price per 1M reaches or exceeds your target.</p>
        <div className="flex w-full min-w-0 max-w-md flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            type="number"
            placeholder="Target / 1M (₹)"
            className="input-field min-h-11 min-w-0 flex-1 [appearance:textfield] sm:max-w-xs [&::-webkit-inner-spin-button]:appearance-none"
            value={alert1m}
            onChange={(e) => setAlert1m(e.target.value)}
          />
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-md bg-violet-600/80 px-4 text-sm text-white sm:w-auto"
            onClick={() => {
              const t = parseFloat(alert1m);
              if (!t || t < 0) {
                toast.error("Enter a target");
                return;
              }
              void addAlert("1m", t);
            }}
          >
            Save
          </button>
        </div>
      </div>

      <div className="card-glow space-y-2">
        <div className="flex items-center gap-2 text-sm text-zinc-200">
          <Bell className="h-4 w-4" />
          Notifications
        </div>
        {noti.length === 0 && <p className="text-sm text-zinc-500">No notifications yet.</p>}
        <ul className="space-y-1">
          {noti.map((n) => (
            <li
              key={n._id}
              className={cn("rounded border border-white/5 px-2 py-1 text-sm", !n.read && "bg-violet-500/5")}
            >
              <span className="text-zinc-200">{n.title}:</span> {n.message}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-200">Past orders</h2>
        {orders.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            No orders yet.{" "}
            <Link href="/sell" className="text-violet-400 hover:underline">
              Sell
            </Link>
            .
          </p>
        )}
        <ul className="mt-2 space-y-1">
          {orders.map((o) => (
            <li key={o._id}>
              <Link
                href={`/orders/${o._id}`}
                className="card-glow flex flex-col gap-0.5 border border-white/5 transition hover:border-violet-500/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {o.itemName} ×{o.quantity}
                </span>
                <span className="font-mono text-sm text-violet-200">
                  {formatInr(o.payoutAmount)} · {o.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
