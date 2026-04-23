"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Gamepad2, Sparkles, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/** If health responds before this, the overlay is never shown. */
const COLD_THRESHOLD_MS = 2200;
const SKIP_AFTER_MS = 12_000;
const FORCE_DONE_MS = 55_000;

const TIPS = [
  "Seller tiers (Standard → Gold → Diamond) unlock as your lifetime in-game volume grows.",
  "Set a price alert on your dashboard — we’ll help you catch the best buy rate per 1M.",
  "Your RS in-game name is used for ops & referral drops — set it on Dashboard.",
  "The public feed only shows anonymous completed trades — privacy first.",
  "Referrals track toward volume milestones — open Referrals for your code and progress.",
  "On free hosting, a quiet server can take 30–60s to wake. You’re in the queue.",
] as const;

let sessionPlayerId: string | null = null;
function getSessionPlayerId(): string {
  if (typeof window === "undefined") return "—";
  if (sessionPlayerId) return sessionPlayerId;
  try {
    let id = sessionStorage.getItem("donut_cold_id");
    if (!id) {
      id = `player_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("donut_cold_id", id);
    }
    sessionPlayerId = id;
    return id;
  } catch {
    return "player_----";
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

/**
 * Full-screen cold start when the first health check is slow (e.g. Render sleeping).
 * One fetch, CSS animations, static tips — no heavy assets.
 */
export function ColdStartFullPage() {
  const reducedMotion = useReducedMotion();
  const doneRef = useRef(false);
  const timersRef = useRef<Parameters<typeof clearTimeout>[0][]>([]);
  const [visible, setVisible] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [xpNudge, setXpNudge] = useState(false);

  const clearAllTimers = () => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  };

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      setTipIdx((i) => (i + 1) % TIPS.length);
    }, 4500);
    return () => clearInterval(id);
  }, [visible]);

  useEffect(() => {
    doneRef.current = false;
    const ac = new AbortController();

    const addTimer = (fn: () => void, ms: number) => {
      const t = window.setTimeout(fn, ms);
      timersRef.current.push(t);
      return t;
    };

    const finish = (withXp: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearAllTimers();
      setVisible(false);
      setShowSkip(false);
      if (withXp) {
        setXpNudge(true);
        window.setTimeout(() => setXpNudge(false), 700);
      }
    };

    addTimer(() => {
      if (!doneRef.current) setVisible(true);
    }, COLD_THRESHOLD_MS);

    addTimer(() => {
      if (!doneRef.current) setShowSkip(true);
    }, SKIP_AFTER_MS);

    addTimer(() => {
      finish(true);
    }, FORCE_DONE_MS);

    void fetch("/api/health/db", { cache: "no-store", signal: ac.signal })
      .then((r) => {
        if (doneRef.current) return;
        if (r.ok) {
          finish(false);
        } else {
          // 503 = DB not ready, etc. — show overlay; skip/force still apply
          setVisible(true);
        }
      })
      .catch(() => {
        if (doneRef.current) return;
        setVisible(true);
      });

    return () => {
      ac.abort();
      clearAllTimers();
    };
  }, []);

  if (!visible) {
    return null;
  }

  const pid = getSessionPlayerId();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[200] flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-clip overflow-y-auto bg-zinc-950/98 px-4 py-6 text-zinc-200 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))] supports-[height:100dvh]:min-h-[100dvh] sm:px-6 sm:py-8"
    >
      <div className="pointer-events-none fixed inset-0 bg-grid-fade opacity-90" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(124,58,237,0.18),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col items-center justify-center text-center sm:max-w-lg">
        <div
          className={cn(
            "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 ring-1 ring-inset ring-violet-500/30 sm:h-20 sm:w-20",
            !reducedMotion && "motion-safe:animate-soft-glow"
          )}
        >
          <Gamepad2 className="h-8 w-8 text-violet-300/90 sm:h-9 sm:w-9" strokeWidth={1.75} aria-hidden />
        </div>

        <h1 className="text-balance text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          Warming up the exchange
        </h1>
        <p className="mt-2 max-w-md text-balance text-sm leading-relaxed text-zinc-500 sm:text-base">
          Our app host can sleep when idle. Your request is starting the server — this screen shows when
          the wake-up is taking a few seconds.
        </p>

        <div className="mt-6 w-full min-w-0 max-w-sm space-y-1.5 sm:max-w-md">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-zinc-500 sm:text-xs">
            <span className="flex min-w-0 items-center gap-1">
              <Zap className="h-3 w-3 shrink-0 text-amber-400/90" aria-hidden />
              <span className="truncate">Server respawn</span>
            </span>
            <span className="shrink-0 font-mono text-violet-400/90">…</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
            <div
              className={cn(
                "h-full w-full origin-left rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500/90 to-violet-400",
                !reducedMotion && "motion-safe:animate-cold-load"
              )}
              style={reducedMotion ? { transform: "scaleX(0.6)", transformOrigin: "left" } : undefined}
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
            ID: {pid}
          </span>
          <span
            className={cn(
              "order-1 inline-flex items-center justify-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/5 px-2.5 py-1.5 text-violet-200/90 sm:order-2",
              xpNudge && "border-amber-400/35 bg-amber-500/10 text-amber-100"
            )}
          >
            <Trophy className="h-3 w-3 shrink-0" aria-hidden />
            Patience +10 XP
          </span>
        </div>

        {showSkip && (
          <button
            type="button"
            onClick={() => {
              if (doneRef.current) return;
              doneRef.current = true;
              clearAllTimers();
              setVisible(false);
              setShowSkip(false);
            }}
            className="mt-8 min-h-11 w-full min-w-0 max-w-xs rounded-xl border border-white/15 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-violet-500/40 hover:text-zinc-100 sm:max-w-sm"
          >
            Skip and open site
            <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">
              Data may still be connecting — refresh if something looks off.
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
