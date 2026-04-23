import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-6 sm:py-10">
      <div
        className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden
      />
      <div className="relative animate-fade-up">
        <p className="eyebrow flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Premium liquidity
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
          Turn inventory into{" "}
          <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            real payouts
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base text-zinc-400 sm:text-lg">
          We buy <strong className="font-medium text-zinc-300">1M in-game money</strong> at published tier rates.
          Check your tier, lock an estimate, and track your order in one place.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/sell"
            className={cn(
              "group inline-flex items-center justify-center gap-2 rounded-xl",
              "bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-glow",
              "transition hover:bg-violet-500 focus-brand"
            )}
          >
            Sell 1M money
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/register"
            className="focus-brand rounded text-center text-sm text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline sm:text-left"
          >
            New here? Create a seller account
          </Link>
        </div>
      </div>
    </section>
  );
}
