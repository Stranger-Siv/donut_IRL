"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

const DISMISS_KEY = "donut_cold_start_hint_dismissed";

/**
 * Render free tier (and similar hosts) sleep idle dynos. First request can take 30s–1m.
 * Also surfaces when our health check is slow (server was cold).
 */
export function ColdStartNotice() {
  const [visible, setVisible] = useState(false);
  const [wasSlow, setWasSlow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t0 =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    let cancelled = false;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      if (!cancelled) setWasSlow(true);
    }, 4000);
    void fetch("/api/health/db", { cache: "no-store", signal: ac.signal })
      .then((r) => {
        const ms =
          (typeof performance !== "undefined" && performance.now
            ? performance.now()
            : Date.now()) - t0;
        if (ms > 5000) setWasSlow(true);
        else if (!r.ok) setWasSlow(true);
      })
      .catch(() => {
        setWasSlow(true);
      })
      .finally(() => {
        clearTimeout(timer);
      });
    return () => {
      cancelled = true;
      ac.abort();
      clearTimeout(timer);
    };
  }, [visible]);

  if (!visible) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div
      role="status"
      className="relative z-50 border-b border-amber-500/25 bg-amber-950/50 px-3 py-2.5 text-center sm:px-4"
    >
      <div className="mx-auto flex max-w-4xl items-start justify-center gap-2 sm:items-center sm:gap-3">
        <AlertCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/90 sm:mt-0"
          aria-hidden
        />
        <p className="text-balance text-xs leading-relaxed text-amber-100/95 sm:text-sm">
          <span className="font-medium">Server may be waking up.</span> On free hosting, the first load
          after a quiet period can take a minute. The store, prices, and your dashboard will appear once
          the API responds — hang tight.
          {wasSlow && (
            <span className="mt-1 block text-amber-200/80">
              That check was slow; the next actions should be faster.
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-amber-200/80 transition hover:bg-amber-500/20 hover:text-amber-50"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
