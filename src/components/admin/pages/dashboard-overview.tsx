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
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { formatInr } from "@/lib/utils";
import { ClientOnly } from "@/components/client-only";
import { AdminPageHeader, StatGrid } from "../ui";

type Stats = {
  todaySpent: number;
  todayRevenue: number;
  todayProfit: number;
  pendingOrders: number;
  completedToday: number;
  avgCompletionMinutes: number;
  activeUsersToday: number;
  totalPayoutThisMonth: number;
};

type Charts = {
  daily: { day: string; spend: number; revenue: number; orders: number }[];
  profitByDay: { day: string; profit: number }[];
  topItems: { name: string; quantity: number; payout: number }[];
};

export function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const [a, b] = await Promise.all([fetch("/api/admin/stats"), fetch("/api/admin/charts?days=30")]);
    if (!a.ok) setErr("Could not load stats");
    if (a.ok) setStats((await a.json()) as Stats);
    if (b.ok) setCharts((await b.json()) as Charts);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statItems = stats
    ? [
        { label: "Today spent", value: formatInr(stats.todaySpent) },
        { label: "Today revenue (est.)", value: formatInr(stats.todayRevenue) },
        { label: "Today profit (est.)", value: formatInr(stats.todayProfit) },
        { label: "Pending pipeline", value: String(stats.pendingOrders) },
        { label: "Completed today", value: String(stats.completedToday) },
        { label: "Avg completion (min)", value: String(stats.avgCompletionMinutes) },
        { label: "Active users today", value: String(stats.activeUsersToday) },
        { label: "Payout this month", value: formatInr(stats.totalPayoutThisMonth) },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Operations overview"
        desc="Real-time sell-side economics, throughput, and catalog momentum."
      />

      {err && <p className="mb-4 text-sm text-amber-400">{err}</p>}

      <StatGrid items={statItems} loading={!stats} />

      {charts && charts.daily.length > 0 && (
        <ClientOnly
          fallback={
            <div className="mt-8 h-64 animate-pulse rounded-xl bg-zinc-800/40 xl:col-span-2" />
          }
        >
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="card-glow">
              <p className="text-xs font-medium text-zinc-500">Daily spend & revenue (30d)</p>
              <div className="mt-3 h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.daily}>
                    <CartesianGrid stroke="#ffffff08" />
                    <XAxis dataKey="day" stroke="#52525b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #3f3f46",
                      }}
                      labelClassName="text-zinc-300"
                    />
                    <Legend />
                    <Line name="Spend" type="monotone" dataKey="spend" stroke="#a78bfa" dot={false} />
                    <Line
                      name="Revenue (est.)"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#22d3ee"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-glow">
              <p className="text-xs font-medium text-zinc-500">Profit trend (est. 10% margin)</p>
              <div className="mt-3 h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.profitByDay}>
                    <CartesianGrid stroke="#ffffff08" />
                    <XAxis dataKey="day" stroke="#52525b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #3f3f46",
                      }}
                    />
                    <Line type="monotone" dataKey="profit" stroke="#34d399" dot={false} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </ClientOnly>
      )}

      {charts && charts.topItems.length > 0 && (
        <ClientOnly
          fallback={<div className="mt-6 h-56 animate-pulse rounded-xl bg-zinc-800/40" />}
        >
          <div className="mt-6 card-glow">
            <p className="text-xs font-medium text-zinc-500">Top items by payout (30d)</p>
            <div className="mt-3 h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topItems} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid stroke="#ffffff08" horizontal />
                  <XAxis type="number" stroke="#52525b" fontSize={10} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    stroke="#71717a"
                    fontSize={10}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #3f3f46",
                    }}
                  />
                  <Bar dataKey="payout" fill="rgb(139 92 246 / 0.6)" name="Payout" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ClientOnly>
      )}

      {charts && (
        <ClientOnly
          fallback={<div className="mt-6 h-48 animate-pulse rounded-xl bg-zinc-800/40" />}
        >
          <div className="mt-6 card-glow">
            <p className="text-xs font-medium text-zinc-500">Order volume (30d)</p>
            <div className="mt-3 h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.daily}>
                  <CartesianGrid stroke="#ffffff08" />
                  <XAxis dataKey="day" stroke="#52525b" fontSize={10} />
                  <YAxis stroke="#52525b" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #3f3f46",
                    }}
                  />
                  <Line type="monotone" dataKey="orders" stroke="#f472b6" dot={false} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ClientOnly>
      )}
    </div>
  );
}
