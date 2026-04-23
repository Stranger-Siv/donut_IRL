import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  displayName: string;
};

export function HeroSignedIn({ displayName }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 via-zinc-950/40 to-zinc-950/80 px-5 py-8 sm:px-8 sm:py-10">
      <div
        className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <p className="eyebrow text-violet-300/90">Seller account</p>
        <h1 className="mt-2 max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-3xl md:text-4xl">
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
            {displayName}
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm text-zinc-400 sm:text-base">
          This is the public rates page. Use your <strong className="font-medium text-zinc-300">dashboard</strong>{" "}
          for orders, tier, and referrals — or start a new sell in one tap.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <Link
            href="/dashboard"
            className={cn(
              "group inline-flex items-center justify-center gap-2 rounded-xl",
              "bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-glow",
              "transition hover:bg-violet-500 focus-brand"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Open dashboard
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/sell"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15",
              "bg-zinc-900/60 px-5 py-3 text-sm font-medium text-zinc-100",
              "transition hover:border-violet-500/40 hover:bg-zinc-800/80 focus-brand"
            )}
          >
            <ShoppingCart className="h-4 w-4 text-violet-300" />
            New sell
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          You’re signed in — no need to create another account. Browse rates below or jump to the dashboard anytime.
        </p>
      </div>
    </section>
  );
}
