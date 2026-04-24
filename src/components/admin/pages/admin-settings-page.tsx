"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "../ui";

type S = {
  minSellQuantityM: number;
  minSellItemUnits: number;
  referralRewardM: string;
  currencySymbol: string;
  timezone: string;
  supportUrl: string;
  autoCancelHours: number | null;
  maintenanceMode: boolean;
  globalPricingPaused: boolean;
  emergencyPause: boolean;
  adminIpAllowlist: string;
  defaultSlaHours: number;
  businessDayStart: string;
  businessDayEnd: string;
  businessDays: string;
  assignmentMode: "MANUAL" | "ROUND_ROBIN" | "LOAD" | "SKILL";
  itemDailyCapacityText: string;
  displayFxUsdInr: number;
  displayFxEurInr: number;
  referralRewardMDefault?: string;
};

export function AdminSettingsPage() {
  const [s, setS] = useState<S | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/settings");
    if (r.ok) {
      const j = (await r.json()) as Partial<S> & { referralRewardMDefault?: string };
      const jx = j as typeof j & {
        defaultSlaHours?: number;
        businessDayStart?: string;
        businessDayEnd?: string;
        businessDays?: string;
        assignmentMode?: S["assignmentMode"];
        itemDailyCapacity?: Record<string, number>;
        displayFxUsdInr?: number;
        displayFxEurInr?: number;
      };
      setS({
        minSellQuantityM: j.minSellQuantityM ?? 1,
        minSellItemUnits: j.minSellItemUnits ?? 1,
        referralRewardM: j.referralRewardM ?? "5",
        currencySymbol: j.currencySymbol ?? "₹",
        timezone: j.timezone ?? "Asia/Kolkata",
        supportUrl: j.supportUrl ?? "",
        autoCancelHours: j.autoCancelHours ?? null,
        maintenanceMode: j.maintenanceMode ?? false,
        globalPricingPaused: j.globalPricingPaused ?? false,
        emergencyPause: j.emergencyPause ?? false,
        adminIpAllowlist: j.adminIpAllowlist ?? "",
        defaultSlaHours: jx.defaultSlaHours ?? 24,
        businessDayStart: jx.businessDayStart ?? "10:00",
        businessDayEnd: jx.businessDayEnd ?? "22:00",
        businessDays: jx.businessDays ?? "1,2,3,4,5",
        assignmentMode: jx.assignmentMode ?? "MANUAL",
        itemDailyCapacityText: JSON.stringify(jx.itemDailyCapacity ?? {}, null, 0),
        displayFxUsdInr: jx.displayFxUsdInr ?? 83,
        displayFxEurInr: jx.displayFxEurInr ?? 90,
        referralRewardMDefault: j.referralRewardMDefault,
      });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!s) return;
    const { referralRewardMDefault, itemDailyCapacityText, ...rest } = s;
    void referralRewardMDefault;
    let itemDailyCapacity: Record<string, number> = {};
    try {
      const parsed = JSON.parse(itemDailyCapacityText || "{}") as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        itemDailyCapacity = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>)
            .filter(([, v]) => typeof v === "number" && v >= 0)
            .map(([k, v]) => [k, v as number])
        );
      }
    } catch {
      toast.error("Item capacity must be valid JSON, e.g. { \"1m\": 50, \"_default\": 20 }");
      return;
    }
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, itemDailyCapacity }),
    });
    if (!r.ok) toast.error("Failed");
    else {
      toast.success("Saved");
      void load();
    }
  }

  if (!s) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <AdminPageHeader
        title="Platform settings"
        desc={`Default referral in-game: ${s.referralRewardMDefault ?? "5M"}.`}
      />
      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
        <p className="text-sm font-medium text-zinc-200">Minimum sell / order size</p>
        <p className="mt-1 text-xs text-zinc-500">
          Enforced on the sell flow and when orders are created. Sellers cannot go below these.
        </p>
        <label className="mt-3 block text-sm">
          <span className="text-zinc-500">In-game money — minimum (× 1M)</span>
          <input
            type="number"
            min={0.0001}
            step="any"
            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={s.minSellQuantityM}
            onChange={(e) =>
              setS((x) => (x ? { ...x, minSellQuantityM: parseFloat(e.target.value) || 0 } : x))
            }
          />
          <span className="mt-1 block text-[11px] text-zinc-600">
            Example: <span className="font-mono">1</span> = at least 1M total; <span className="font-mono">5</span> = at least 5× 1M.
          </span>
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-zinc-500">Fixed-price items — minimum units per order</span>
          <input
            type="number"
            min={0.0001}
            step="any"
            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={s.minSellItemUnits}
            onChange={(e) =>
              setS((x) => (x ? { ...x, minSellItemUnits: parseFloat(e.target.value) || 0 } : x))
            }
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-zinc-500">Referral reward (display / ops)</span>
        <input
          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
          value={s.referralRewardM}
          onChange={(e) => setS((x) => (x ? { ...x, referralRewardM: e.target.value } : x))}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-500">Currency symbol</span>
        <input
          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
          value={s.currencySymbol}
          onChange={(e) => setS((x) => (x ? { ...x, currencySymbol: e.target.value } : x))}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-500">Timezone (IANA)</span>
        <input
          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
          value={s.timezone}
          onChange={(e) => setS((x) => (x ? { ...x, timezone: e.target.value } : x))}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-500">Support URL</span>
        <input
          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
          value={s.supportUrl}
          onChange={(e) => setS((x) => (x ? { ...x, supportUrl: e.target.value } : x))}
        />
      </label>
      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
        <p className="text-sm font-medium text-zinc-200">Orders, SLA, assignment</p>
        <p className="mt-1 text-xs text-zinc-500">
          Auto-cancel applies while an order is still PENDING (not yet assigned to staff). Set capacity per item
          slug (or <span className="font-mono">_default</span>); empty JSON = no cap.
        </p>
        <label className="mt-3 block text-sm text-zinc-500">
          Auto-cancel PENDING after (hours, blank = off)
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={s.autoCancelHours ?? ""}
            onChange={(e) =>
              setS((x) => {
                if (!x) return x;
                const v = e.target.value;
                if (v === "")
                  return { ...x, autoCancelHours: null };
                const n = parseInt(v, 10);
                return { ...x, autoCancelHours: Number.isFinite(n) && n > 0 ? n : null };
              })
            }
            placeholder="e.g. 48"
          />
        </label>
        <label className="mt-2 block text-sm text-zinc-500">
          Default SLA (hours, copy for buyers)
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={s.defaultSlaHours}
            onChange={(e) =>
              setS((x) => (x ? { ...x, defaultSlaHours: parseInt(e.target.value, 10) || 24 } : x))
            }
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="text-sm text-zinc-500">
            Open from
            <input
              className="ml-1 rounded border border-white/10 bg-zinc-950 px-1 py-0.5"
              value={s.businessDayStart}
              onChange={(e) => setS((x) => (x ? { ...x, businessDayStart: e.target.value } : x))}
            />
          </label>
          <label className="text-sm text-zinc-500">
            to
            <input
              className="ml-1 rounded border border-white/10 bg-zinc-950 px-1 py-0.5"
              value={s.businessDayEnd}
              onChange={(e) => setS((x) => (x ? { ...x, businessDayEnd: e.target.value } : x))}
            />
          </label>
        </div>
        <label className="mt-2 block text-sm text-zinc-500">
          Business days (0=Sun…6=Sat, comma)
          <input
            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={s.businessDays}
            onChange={(e) => setS((x) => (x ? { ...x, businessDays: e.target.value } : x))}
          />
        </label>
        <label className="mt-2 block text-sm text-zinc-500">
          Auto-assign new orders
          <select
            className="mt-1 block w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={s.assignmentMode}
            onChange={(e) =>
              setS((x) =>
                x ? { ...x, assignmentMode: e.target.value as S["assignmentMode"] } : x
              )
            }
          >
            <option value="MANUAL">MANUAL (admin picks)</option>
            <option value="ROUND_ROBIN">ROUND_ROBIN</option>
            <option value="LOAD">LOAD (fewest open)</option>
            <option value="SKILL">SKILL (match item slug to staff list)</option>
          </select>
        </label>
        <label className="mt-2 block text-sm text-zinc-500">
          Intake per item (JSON: slug → max open orders in rolling 24h)
          <textarea
            rows={3}
            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 font-mono text-xs"
            value={s.itemDailyCapacityText}
            onChange={(e) => setS((x) => (x ? { ...x, itemDailyCapacityText: e.target.value } : x))}
          />
        </label>
        <p className="mt-1 text-[11px] text-zinc-600">
          Staff <span className="font-mono">assignmentSkills</span> (editable on Admin → Users) lists item slugs, or * for
          all. SKILL mode uses that list.
        </p>
        <p className="mt-2 text-[11px] text-zinc-600">
          Auto-expire: schedule a cron to call{" "}
          <code className="rounded border border-white/5 px-0.5 font-mono text-zinc-500">GET /api/cron/expire-orders</code>{" "}
          with <code className="rounded border border-white/5 px-0.5 font-mono text-zinc-500">Authorization: Bearer $CRON_SECRET</code>{" "}
          (set in env) so stuck PENDING orders are cancelled even if nobody views them.
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
        <p className="text-sm font-medium text-zinc-200">Reference FX (display on sell; settlement INR)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="text-sm text-zinc-500">
            INR / 1 USD
            <input
              type="number"
              min={1}
              step={0.01}
              className="ml-1 w-24 rounded border border-white/10 bg-zinc-950 px-1 py-0.5"
              value={s.displayFxUsdInr}
              onChange={(e) =>
                setS((x) => (x ? { ...x, displayFxUsdInr: parseFloat(e.target.value) || 83 } : x))
              }
            />
          </label>
          <label className="text-sm text-zinc-500">
            INR / 1 EUR
            <input
              type="number"
              min={1}
              step={0.01}
              className="ml-1 w-24 rounded border border-white/10 bg-zinc-950 px-1 py-0.5"
              value={s.displayFxEurInr}
              onChange={(e) =>
                setS((x) => (x ? { ...x, displayFxEurInr: parseFloat(e.target.value) || 90 } : x))
              }
            />
          </label>
        </div>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            className="mt-1"
            checked={s.maintenanceMode}
            onChange={(e) => setS((x) => (x ? { ...x, maintenanceMode: e.target.checked } : x))}
          />
          <span>
            <span className="font-medium">Full-site maintenance (everyone but admins)</span>
            <span className="mt-1 block text-xs text-zinc-500">
              Non-admins and staff see the full-page maintenance screen. APIs return 503 except system routes (auth, health, webhooks, cron). Set Support URL above for a link on that screen.
            </span>
          </span>
        </label>
      </div>
      <label className="block text-sm text-zinc-500">
        Admin IP allowlist (one per line, optional)
        <textarea
          rows={3}
          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 font-mono text-xs"
          value={s.adminIpAllowlist}
          onChange={(e) => setS((x) => (x ? { ...x, adminIpAllowlist: e.target.value } : x))}
        />
      </label>
      <button type="button" onClick={() => void save()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm">
        Save
      </button>
    </div>
  );
}
