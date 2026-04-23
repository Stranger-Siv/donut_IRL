import { ListOrdered } from "lucide-react";

type Feed = { id: string; line: string; at?: Date }[];

export function RecentTradesFeed({ items }: { items: Feed }) {
  return (
    <section className="space-y-4" aria-label="Recent trades (anonymous)">
      <div className="flex items-center gap-2 text-sm text-zinc-300">
        <ListOrdered className="h-4 w-4 text-violet-400" />
        Recent trades
      </div>
      <p className="text-xs text-zinc-500">
        Public feed is anonymous — we never show Discord handles or in-game names.
      </p>
      <ul className="space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-zinc-500">Trades will appear as they complete.</li>
        )}
        {items.map((t) => (
          <li
            key={t.id}
            className="card-glow break-words border-dashed text-sm text-zinc-200"
          >
            {t.line}
          </li>
        ))}
      </ul>
    </section>
  );
}
