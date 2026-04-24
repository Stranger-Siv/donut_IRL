"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { HardHat, Sparkles, Trophy, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const TIPS = [
  "We’ll be back soon — orders and quotes pause while we patch things up.",
  "Your data stays put; this is a temporary pause in the public exchange.",
  "We’re upgrading the pipes — check back a bit later for live rates and sells.",
  "Follow the support link below if you need status or help with an open order.",
  "Tier rates and promos can change after a deploy — the home feed will be ready when we’re up.",
] as const;

/** How often to ask the server if maintenance ended (ms). */
const MAINTENANCE_STATUS_POLL_MS = 60_000;

let guestId: string | null = null;
function getGuestId(): string {
  if (typeof window === "undefined") return "—";
  if (guestId) return guestId;
  try {
    let id = sessionStorage.getItem("donut_maint_id");
    if (!id) {
      id = `crew_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("donut_maint_id", id);
    }
    guestId = id;
    return id;
  } catch {
    return "crew_----";
  }
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    () => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const fn = () => {};
      mq.addEventListener("change", fn);
      return () => mq.removeEventListener("change", fn);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

export function MaintenanceModeFullPage({ supportUrl }: { supportUrl: string }) {
  const reducedMotion = useReducedMotion();
  const [tipIdx, setTipIdx] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIdx((i) => (i + 1) % TIPS.length);
    }, 4800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStreak((n) => (n >= 999 ? 0 : n + 3));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  /** When maintenance is turned off, reload the same path + search (keeps the page they wanted). */
  useEffect(() => {
    const ac = new AbortController();
    const check = async () => {
      try {
        const r = await fetch("/api/maintenance/status", {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!r.ok) return;
        const j = (await r.json()) as { active?: boolean };
        if (j?.active === false) {
          window.location.assign(window.location.href);
        }
      } catch {
        /* still on maintenance or network hiccup — try again on interval */
      }
    };
    void check();
    const timer = window.setInterval(() => {
      void check();
    }, MAINTENANCE_STATUS_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      ac.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const gid = getGuestId();
  const support = supportUrl?.trim() ?? "";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[250] flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-clip overflow-y-auto bg-zinc-950/98 px-4 py-6 text-zinc-200 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))] supports-[height:100dvh]:min-h-[100dvh] sm:px-6 sm:py-8"
    >
      <div className="pointer-events-none fixed inset-0 bg-grid-fade opacity-90" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(234,179,8,0.1),transparent_50%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col items-center justify-center text-center sm:max-w-lg">
        <div
          className={cn(
            "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-inset ring-amber-500/30 sm:h-20 sm:w-20",
            !reducedMotion && "motion-safe:animate-soft-glow"
          )}
        >
          <HardHat className="h-8 w-8 text-amber-200/90 sm:h-9 sm:w-9" strokeWidth={1.75} aria-hidden />
        </div>

        <h1 className="text-balance text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          We&apos;re in maintenance
        </h1>
        <p className="mt-2 max-w-md text-balance text-sm leading-relaxed text-zinc-500 sm:text-base">
          The team is working on the exchange. We&apos;ll be back shortly — thanks for your patience.
        </p>
        <p className="mt-2 max-w-md text-balance text-[11px] leading-relaxed text-zinc-600 sm:text-xs">
          We check in the background every minute; when the site is open again, this page will refresh and take you
          to the same address you were using (including the path you had open).
        </p>

        <div className="mt-6 w-full min-w-0 max-w-sm space-y-1.5 sm:max-w-md">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-zinc-500 sm:text-xs">
            <span className="flex min-w-0 items-center gap-1">
              <Wrench className="h-3 w-3 shrink-0 text-amber-400/90" aria-hidden />
              <span className="truncate">Patch bar</span>
            </span>
            <span className="shrink-0 font-mono text-amber-400/90">{streak > 0 ? `+${streak}` : "…"}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
            <div
              className={cn(
                "h-full w-full origin-left rounded-full bg-gradient-to-r from-amber-600 via-amber-400/90 to-amber-500",
                !reducedMotion && "motion-safe:animate-cold-load"
              )}
              style={reducedMotion ? { transform: "scaleX(0.55)", transformOrigin: "left" } : undefined}
            />
          </div>
        </div>

        <div className="mt-6 w-full min-w-0 max-w-sm rounded-2xl border border-white/10 bg-zinc-900/50 p-3 text-left sm:max-w-md sm:p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200/80 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Tip
          </p>
          <p className="mt-2 min-w-0 text-xs leading-relaxed text-zinc-400 sm:text-sm" key={tipIdx}>
            {TIPS[tipIdx]}
          </p>
        </div>

        <div className="mt-5 flex w-full min-w-0 max-w-sm flex-col items-stretch gap-2 text-[11px] text-zinc-600 sm:max-w-md sm:flex-row sm:flex-wrap sm:justify-center sm:text-xs">
          <span className="order-2 rounded-full border border-white/5 bg-zinc-900/60 px-2.5 py-1.5 text-center font-mono text-zinc-500 sm:order-1 sm:inline-flex sm:shrink-0 sm:px-2.5">
            Crew ID: {gid}
          </span>
          <span className="order-1 inline-flex items-center justify-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-amber-100/90 sm:order-2">
            <Trophy className="h-3 w-3 shrink-0" aria-hidden />
            Standby +15 XP
          </span>
        </div>

        {support ? (
          <a
            href={support}
            className="mt-6 text-sm text-amber-200/80 underline decoration-amber-500/40"
            rel="noreferrer"
          >
            Support / status
          </a>
        ) : null}
      </div>
    </div>
  );
}
