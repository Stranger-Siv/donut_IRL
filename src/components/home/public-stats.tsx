import { Banknote, Timer, BarChart2 } from "lucide-react";
import { formatInr } from "@/lib/utils";

export function PublicStatsRow({
  totalPaid,
  totalTrades,
  avgPayoutTimeMinutes,
}: {
  totalPaid: number;
  totalTrades: number;
  avgPayoutTimeMinutes: number;
}) {
  const stats = [
    { label: "Total paid out", value: formatInr(totalPaid), icon: Banknote },
    { label: "Total trades", value: String(totalTrades), icon: BarChart2 },
    {
      label: "Avg payout time",
      value: totalTrades ? `~${avgPayoutTimeMinutes} min` : "—",
      icon: Timer,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="card-glow flex items-start gap-3 border border-white/5 bg-zinc-900/50"
        >
          <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" aria-hidden />
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">{s.label}</p>
            <p className="mt-0.5 font-mono text-lg text-zinc-100">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
