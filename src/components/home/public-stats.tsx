import { Banknote, Timer, BarChart2 } from "lucide-react";
import { cn, formatInr } from "@/lib/utils";

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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "card-glow flex min-w-0 items-start gap-3 border border-white/5 bg-zinc-900/50",
            "p-3.5 sm:p-4"
          )}
        >
          <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 sm:text-xs">{s.label}</p>
            <p className="mt-0.5 break-words font-mono text-base text-zinc-100 sm:text-lg">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
