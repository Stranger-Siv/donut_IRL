"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, Link2, RefreshCw, Users } from "lucide-react";
import { AdminPageHeader, StatGrid, TableShell } from "../ui";
import { cn } from "@/lib/utils";

type Member = {
  userId: string;
  email: string;
  name: string;
  signedUpAt: string | null;
};

type SameIpRow = {
  ip: string;
  count: number;
  userIds: string[];
  reason: string;
  firstSignupAt: string | null;
  lastSignupAt: string | null;
  members: Member[];
};

type DupPayout = {
  detail: string;
  count: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  sampleOrderIds: string[];
  reason: string;
};

type ReferralNear = {
  _id: string;
  code: string;
  progressVolumeM: number;
  referredEmail: string;
  referredName: string;
  referrerEmail: string;
  linkCreatedAt: string | null;
  updatedAt: string | null;
  reason: string;
};

type HighValue = {
  _id: string;
  payoutAmount: number;
  userId: string;
  userEmail: string;
  userName: string;
  itemName: string;
  itemSlug: string;
  status: string;
  payoutMethod: string;
  createdAt: string | null;
  reason: string;
};

type LastCompleted = {
  orderId: string;
  completedAt: string | null;
  payoutAmount: number;
  itemName: string;
  userEmail: string;
  reason: string;
};

type FraudPayload = {
  generatedAt: string;
  referralVolumeThresholdM: number;
  referralNearMMin: number;
  sameIp: SameIpRow[];
  duplicatePayoutDetails: DupPayout[];
  referralNearThreshold: number;
  referralNearList: ReferralNear[];
  lastCompleted: LastCompleted | null;
  highValuePending: HighValue[];
};

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function SectionIntro({
  title,
  why,
  icon: Icon,
}: {
  title: string;
  why: string;
  icon: typeof Users;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Icon className="h-4 w-4 text-violet-400/90" />
          {title}
        </h3>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">{why}</p>
      </div>
    </div>
  );
}

function ReasonBox({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/90" />
      <span>
        <span className="font-medium text-amber-200/95">Why it&apos;s here · </span>
        {text}
      </span>
    </div>
  );
}

export function AdminFraudPage() {
  const [d, setD] = useState<FraudPayload | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/fraud", { cache: "no-store" });
    if (r.ok) setD((await r.json()) as FraudPayload);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const sameIp = d?.sameIp ?? [];
  const dupPay = d?.duplicatePayoutDetails ?? [];
  const refList = d?.referralNearList ?? [];
  const high = d?.highValuePending ?? [];
  const thresholdM = d?.referralVolumeThresholdM ?? 50;
  const nearMin = d?.referralNearMMin ?? 40;

  const statItems = d
    ? [
        { label: "Same-IP groups", value: String(sameIp.length), sub: "≥2 users / IP" },
        { label: "Reused payout strings", value: String(dupPay.length) },
        {
          label: "Referrals near reward",
          value: String(d.referralNearThreshold),
          sub: `>${nearMin}M & pending`,
        },
        { label: "High-value pipeline", value: String(high.length), sub: "≥ ₹20k" },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Fraud and risk"
        desc="Automated heuristics only — not proof of abuse. Use reasons and timestamps to decide when to follow up, merge accounts, or mark referrals ineligible."
      >
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </AdminPageHeader>

      {d && (
        <p className="mb-4 flex items-center gap-1.5 text-[11px] text-zinc-600">
          <Clock className="h-3 w-3" />
          Data as of {formatWhen(d.generatedAt)} · Referral reward threshold {thresholdM}M
        </p>
      )}

      {d && <StatGrid items={statItems} />}

      {!d ? (
        <p className="mt-6 text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-8 space-y-10">
          {/* Last completed sanity */}
          {d.lastCompleted && (
            <div className="card-glow space-y-2">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Pipeline sanity
              </p>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-zinc-200">Last completed order in the system</p>
                <time className="text-xs text-zinc-500" dateTime={d.lastCompleted.completedAt ?? undefined}>
                  {formatWhen(d.lastCompleted.completedAt)}
                </time>
              </div>
              <ReasonBox text={d.lastCompleted.reason} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>
                  {d.lastCompleted.itemName} ·{" "}
                  <span className="font-mono text-violet-200/90">₹{d.lastCompleted.payoutAmount}</span>
                </span>
                <span>Seller: {d.lastCompleted.userEmail}</span>
                <Link
                  href={`/admin/orders/${d.lastCompleted.orderId}`}
                  className="inline-flex items-center gap-1 text-violet-400 hover:underline"
                >
                  <Link2 className="h-3 w-3" />
                  Open order
                </Link>
              </div>
            </div>
          )}

          {/* Same IP */}
          <div>
            <SectionIntro
              title="Same signup IP"
              why="Flags accounts that registered from the same IP. Can be a shared household or VPN — combine with other signals before action."
              icon={Users}
            />
            {sameIp.length === 0 ? (
              <p className="text-sm text-zinc-600">No groups with 2+ users on one signup IP.</p>
            ) : (
              <ul className="space-y-4">
                {sameIp.map((row) => (
                  <li key={row.ip} className="space-y-2">
                    <TableShell>
                      <div className="p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-sm text-zinc-200">{row.ip}</span>
                          <span className="text-xs text-zinc-500">{row.count} accounts</span>
                        </div>
                        <ReasonBox text={row.reason} />
                        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-zinc-500">
                          <span>
                            First signup: <span className="text-zinc-400">{formatWhen(row.firstSignupAt)}</span>
                          </span>
                          <span>
                            Last signup: <span className="text-zinc-400">{formatWhen(row.lastSignupAt)}</span>
                          </span>
                        </div>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[480px] text-left text-sm">
                            <thead className="text-[10px] uppercase text-zinc-500">
                              <tr>
                                <th className="p-1.5">User</th>
                                <th className="p-1.5">Email</th>
                                <th className="p-1.5">Signed up</th>
                              </tr>
                            </thead>
                            <tbody className="text-zinc-300">
                              {row.members.map((m) => (
                                <tr key={m.userId} className="border-t border-white/5">
                                  <td className="p-1.5 text-xs">{m.name}</td>
                                  <td className="p-1.5 font-mono text-[11px] text-zinc-400">
                                    {m.email}
                                  </td>
                                  <td className="p-1.5 text-xs text-zinc-500">
                                    {formatWhen(m.signedUpAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </TableShell>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reused payout details */}
          <div>
            <SectionIntro
              title="Reused payout details"
              why="Same UPI / bank / crypto line used on more than one order. Often legitimate (user re-sell) but worth checking for account linking or copy-paste fraud."
              icon={Link2}
            />
            {dupPay.length === 0 ? (
              <p className="text-sm text-zinc-600">No duplicate payout fingerprints in the current window.</p>
            ) : (
              <ul className="space-y-3">
                {dupPay.map((row) => (
                  <li key={row.detail} className="space-y-2">
                    <TableShell>
                      <div className="p-3">
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs text-zinc-500">{row.count}× uses</span>
                        </div>
                        <p className="break-all font-mono text-xs text-zinc-300">{row.detail}</p>
                        <div className="mt-2">
                          <ReasonBox text={row.reason} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-zinc-500">
                          <span>
                            First seen: {formatWhen(row.firstSeenAt)}
                          </span>
                          <span>
                            Last seen: {formatWhen(row.lastSeenAt)}
                          </span>
                        </div>
                        {row.sampleOrderIds.length > 0 && (
                          <p className="mt-2 text-[11px] text-zinc-500">
                            Sample orders:{" "}
                            {row.sampleOrderIds.map((id, i) => (
                              <span key={id}>
                                {i > 0 ? " · " : ""}
                                <Link
                                  href={`/admin/orders/${id}`}
                                  className="font-mono text-violet-400/90 hover:underline"
                                >
                                  …{id.slice(-8)}
                                </Link>
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    </TableShell>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Referrals near 50M */}
          <div>
            <SectionIntro
              title="Referrals approaching reward"
              why={`PENDING referrals with referred volume above ${nearMin}M (still below ${thresholdM}M for payout). Good moment to review before the reward is granted.`}
              icon={AlertCircle}
            />
            {refList.length === 0 ? (
              <p className="text-sm text-zinc-600">No PENDING referrals in the {nearMin}M–{thresholdM}M range right now.</p>
            ) : (
              <TableShell>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs text-zinc-500">
                      <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Progress</th>
                        <th className="p-2">Referred</th>
                        <th className="p-2">Referrer (login)</th>
                        <th className="p-2 min-w-[200px]">When / why</th>
                      </tr>
                    </thead>
                    <tbody className="text-zinc-300">
                      {refList.map((r) => {
                        const pct = Math.min(100, (r.progressVolumeM / thresholdM) * 100);
                        return (
                          <tr key={r._id} className="border-t border-white/5">
                            <td className="p-2 font-mono text-xs text-violet-200/90">{r.code}</td>
                            <td className="p-2">
                              <div className="text-xs font-mono text-zinc-200">
                                {r.progressVolumeM}M / {thresholdM}M
                              </div>
                              <div className="mt-1 h-1.5 w-28 max-w-full overflow-hidden rounded-full bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-amber-500/80"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="p-2 text-xs">
                              {r.referredName}
                              <br />
                              <span className="text-[11px] text-zinc-500">{r.referredEmail}</span>
                            </td>
                            <td className="p-2 text-xs text-zinc-400">{r.referrerEmail}</td>
                            <td className="p-2 align-top text-xs text-zinc-500">
                              <p className="text-[11px] leading-relaxed text-zinc-400">
                                {r.reason}
                              </p>
                              <p className="mt-1 text-[10px] text-zinc-600">
                                Link: {formatWhen(r.linkCreatedAt)} · Upd: {formatWhen(r.updatedAt)}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TableShell>
            )}
          </div>

          {/* High value */}
          <div>
            <SectionIntro
              title="High exposure — pipeline (≥ ₹20,000)"
              why="Open or held orders with large payouts. Triage for verification speed and correct payout references before completion."
              icon={AlertCircle}
            />
            {high.length === 0 ? (
              <p className="text-sm text-zinc-600">No qualifying orders in PENDING / ASSIGNED / HOLD.</p>
            ) : (
              <TableShell>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="text-xs text-zinc-500">
                      <tr>
                        <th className="p-2">Order</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Seller</th>
                        <th className="p-2">Item</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Created</th>
                        <th className="p-2 min-w-[200px]">Why flagged</th>
                      </tr>
                    </thead>
                    <tbody className="text-zinc-300">
                      {high.map((o) => (
                        <tr key={o._id} className="border-t border-white/5">
                          <td className="p-2">
                            <Link
                              href={`/admin/orders/${o._id}`}
                              className="font-mono text-xs text-violet-400 hover:underline"
                            >
                              {o._id.slice(-8)}
                            </Link>
                          </td>
                          <td className="p-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                o.status === "HOLD" && "bg-amber-500/15 text-amber-200/90",
                                o.status === "PENDING" && "bg-zinc-800 text-zinc-400",
                                o.status === "ASSIGNED" && "bg-cyan-500/10 text-cyan-200/80"
                              )}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-violet-200/90">₹{o.payoutAmount}</td>
                          <td className="p-2 text-xs">
                            {o.userName}
                            <br />
                            <span className="text-[11px] text-zinc-500">{o.userEmail}</span>
                          </td>
                          <td className="p-2 text-xs text-zinc-400">{o.itemName}</td>
                          <td className="p-2 text-xs text-zinc-500">{o.payoutMethod}</td>
                          <td className="p-2 text-xs text-zinc-500 whitespace-nowrap">
                            {formatWhen(o.createdAt)}
                          </td>
                          <td className="p-2 align-top text-[11px] leading-relaxed text-zinc-500">
                            {o.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TableShell>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
