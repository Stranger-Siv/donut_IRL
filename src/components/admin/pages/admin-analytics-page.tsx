"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatInr } from "@/lib/utils";
import { ClientOnly } from "@/components/client-only";
import { AdminPageHeader, StatGrid } from "../ui";

type Data = {
  range: string;
  totalSpent: number;
  totalEarned: number;
  netProfit: number;
  ordersCompleted: number;
  avgPerM: number;
  avgCompletionMinutes: number;
  repeatSellerPercent: number;
  referralOrderPercent: number;
  conversionRate: number;
  daily: { day: string; spent: number; earned: number; orders: number }[];
};

export function AdminAnalyticsPage() {
  const [range, setRange] = useState<"today" | "week" | "month">("week");
  const [data, setData] = useState<Data | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (from && to) {
      p.set("from", from);
      p.set("to", to);
    } else {
      p.set("range", range);
    }
    const r = await fetch(`/api/admin/analytics?${p}`);
    if (r.ok) setData((await r.json()) as Data);
  }, [range, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data
    ? [
        { label: "Total spent", value: formatInr(data.totalSpent) },
        { label: "Net profit (est.)", value: formatInr(data.netProfit ?? data.totalEarned) },
        { label: "Orders", value: String(data.ordersCompleted) },
        { label: "Avg ₹ / M (curr.)", value: `₹${data.avgPerM}` },
        { label: "Avg completion (min)", value: String(data.avgCompletionMinutes) },
        { label: "Repeat seller %", value: `${data.repeatSellerPercent}%` },
        { label: "Referral orders %", value: `${data.referralOrderPercent}%` },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        desc={data?.range ?? "Loading…"}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {(["today", "week", "month"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              setRange(k);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              range === k && !from
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {k}
          </button>
        ))}
        <span className="self-center text-xs text-zinc-600">or custom:</span>
        <input
          type="date"
          className="rounded border border-white/10 bg-zinc-950 px-2 py-1 text-sm"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="date"
          className="rounded border border-white/10 bg-zinc-950 px-2 py-1 text-sm"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button type="button" onClick={() => void load()} className="rounded bg-zinc-700 px-2 py-1 text-sm">
          Apply
        </button>
      </div>
      <StatGrid items={items} loading={!data} />
      {data && data.daily.length > 0 && (
        <div className="mt-8 card-glow">
          <p className="text-xs text-zinc-500">Volume by day</p>
          <ClientOnly
            fallback={
              <div className="mt-2 h-64 animate-pulse rounded-lg bg-zinc-800/40" aria-hidden />
            }
          >
            <div className="mt-2 h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily}>
                  <CartesianGrid stroke="#fff1" />
                  <XAxis dataKey="day" fontSize={10} stroke="#71717a" />
                  <YAxis fontSize={10} stroke="#71717a" />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                  />
                  <Line dataKey="spent" stroke="#a78bfa" name="Spent" dot={false} />
                  <Line dataKey="orders" stroke="#f472b6" name="Orders" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ClientOnly>
        </div>
      )}
    </div>
  );
}
