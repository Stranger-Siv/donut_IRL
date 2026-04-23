import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex min-w-0 max-w-full flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
      <div className="min-w-0 max-w-full">
        <h1 className="text-balance text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          {title}
        </h1>
        {desc && (
          <p className="mt-1.5 break-words text-sm leading-relaxed text-zinc-500 sm:mt-1">{desc}</p>
        )}
      </div>
      {children && <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{children}</div>}
    </div>
  );
}

export function StatGrid({
  items,
  loading,
}: {
  items: { label: string; value: string; sub?: string }[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-white/5 bg-zinc-900/50"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s) => (
        <div
          key={s.label}
          className={cn(
            "card-glow border border-white/5 p-3.5 sm:p-4",
            "hover:border-violet-500/20 transition-colors"
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            {s.label}
          </p>
          <p className="mt-1.5 break-words font-mono text-lg text-zinc-100 sm:mt-2 sm:text-xl">
            {s.value}
          </p>
          {s.sub && <p className="mt-0.5 text-xs text-zinc-600">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function TableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-white/5 bg-zinc-900/40",
        className
      )}
    >
      <div className="w-full min-w-0 max-w-full overflow-x-clip">{children}</div>
    </div>
  );
}
