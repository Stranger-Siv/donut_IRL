"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "../ui";

type W = {
  completedTrades: boolean;
  rateUpdates: boolean;
  promotions: boolean;
  vouches: boolean;
  templateTrade: string;
  templateRate: string;
  templatePromo: string;
};

export function AdminDiscordPage() {
  const [w, setW] = useState<W | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/webhook-settings");
    if (r.ok) setW((await r.json()) as W);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!w) return;
    const r = await fetch("/api/admin/webhook-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(w),
    });
    if (!r.ok) toast.error("Save failed");
    else toast.success("Saved");
  }

  async function test(t: "promo" | "rate" | "trade" | "vouch") {
    const r = await fetch("/api/admin/webhook-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: t }),
    });
    const j = await r.json();
    if (!r.ok) toast.error("Failed");
    else toast.message(j.message || (j.ok ? "Sent" : "Check env"));
  }

  if (!w) {
    return <p className="text-zinc-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Discord webhooks"
        desc="Toggles and templates for anonymous public feed posts. Set DISCORD_WEBHOOK_URL in env."
      />
      <div className="card-glow space-y-3 max-w-2xl">
        {(
          [
            ["completedTrades", "Completed trade feed"],
            ["rateUpdates", "Rate / catalog updates"],
            ["promotions", "Promotions"],
            ["vouches", "Vouches"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={w[k] as boolean}
              onChange={(e) => setW((x) => (x ? { ...x, [k]: e.target.checked } : x))}
            />
            {label}
          </label>
        ))}
        <div className="pt-2 space-y-2">
          <label className="block text-xs text-zinc-500">Trade template (use {`{body}`})</label>
          <input
            className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
            value={w.templateTrade}
            onChange={(e) => setW((x) => (x ? { ...x, templateTrade: e.target.value } : x))}
          />
          <label className="block text-xs text-zinc-500">Rate template</label>
          <input
            className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
            value={w.templateRate}
            onChange={(e) => setW((x) => (x ? { ...x, templateRate: e.target.value } : x))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm"
          >
            Save
          </button>
          <span className="self-center text-xs text-zinc-500">Test:</span>
          {(["trade", "rate", "promo", "vouch"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => void test(t)}
              className="rounded border border-white/10 px-2 py-1 text-xs"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
