"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, Gift, Link2, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { INELIGIBILITY_EXPLANATION_FALLBACK } from "@/lib/referral-ineligible";
import { REFERRAL_VOLUME_THRESHOLD_M } from "@/lib/constants";

function isIneligibleStatus(st: string | undefined) {
  return String(st ?? "")
    .trim()
    .toUpperCase() === "INELIGIBLE";
}

type Ref = {
  referralCode: string;
  inGameName?: string;
  referredPendingCount: number;
  referredCompletedRewards: number;
  minVolumeMForReward: number;
  rewardInGame: string;
  rewardGoesTo: string;
  invites: {
    _id: string;
    progressVolumeM: number;
    displayProgressM?: number;
    status: string;
    displayName: string;
    signedUpAt: string;
    lastActiveAt: string | null;
    hasCompletedTrade: boolean;
    referredInGameName?: string | null;
    ineligibilityExplanation: string | null;
  }[];
  yourReferral: {
    status: string;
    progressVolumeM: number;
    displayProgressM?: number;
    ineligibilityExplanation: string | null;
  } | null;
};

function formatM(n: number) {
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 10) / 10).toString();
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shareUrlForCode(code: string | undefined) {
  if (typeof window === "undefined" || !code) return "";
  return `${window.location.origin}/sell?ref=${code}`;
}

export function ReferralsClient() {
  const [ref, setRef] = useState<Ref | null>(null);
  const [loading, setLoading] = useState(true);
  const [ignDraft, setIgnDraft] = useState("");
  const [savingIgn, setSavingIgn] = useState(false);
  /** When user already has a saved IGN, hide the field until they tap "Change". */
  const [ignEditing, setIgnEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, me] = await Promise.all([
        fetch("/api/referrals", { cache: "no-store", credentials: "include" }),
        fetch("/api/user/me", { cache: "no-store", credentials: "include" }),
      ]);
      if (!r.ok) {
        setRef(null);
        return;
      }
      const data = (await r.json()) as Ref;
      /** Profile `GET /api/user/me` is the source of truth for `inGameName` (same field as in referrals API). */
      if (me.ok) {
        const u = (await me.json()) as { inGameName?: string };
        data.inGameName = (u.inGameName ?? "").trim();
      }
      setRef(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (ref && !ignEditing) {
      setIgnDraft((ref.inGameName ?? "").trim());
    }
  }, [ref, ignEditing]);

  const savedIgn = (ref?.inGameName || "").trim();
  const hasSavedIgn = Boolean(savedIgn);
  const showIgnInput = !hasSavedIgn || ignEditing;

  async function copyText(text: string, done: string) {
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
    } catch {
      toast.error("Could not copy — try selecting the text and copying manually.");
    }
  }

  async function saveIgn() {
    setSavingIgn(true);
    try {
      const r = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inGameName: ignDraft.trim() }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string; details?: unknown };
        const extra =
          j.details && typeof j.details === "object" ? JSON.stringify(j.details) : "";
        throw new Error(j.error || (extra ? `Invalid: ${extra}` : "Could not save"));
      }
      const saved = (await r.json().catch(() => ({}))) as { inGameName?: string };
      toast.success("In-game name updated");
      setIgnEditing(false);
      if (typeof saved.inGameName === "string" && ref) {
        setRef({ ...ref, inGameName: saved.inGameName });
        setIgnDraft(saved.inGameName);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingIgn(false);
    }
  }

  function staffRewardMessage() {
    const name = (ignDraft || ref?.inGameName || "").trim();
    const lines = [
      "Referral reward — where to pay me in-game",
      `My in-game name: ${name || "[not set yet — add on Referrals]"}`,
      `My referral code: ${code || "—"}`,
    ];
    return lines.join("\n");
  }

  const code = ref?.referralCode;
  const inviteLink = shareUrlForCode(code);

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-balance text-xl font-semibold text-zinc-50 sm:text-2xl">Referrals</h1>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          Share your personal link. When someone uses it, your code is applied for rewards (see below).
        </p>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {!loading && !ref && <p className="text-sm text-zinc-500">Could not load referral data.</p>}

      {ref && (
        <>
          {/* Pinned to top: ineligibility notice when you joined via a link */}
          {ref.yourReferral && isIneligibleStatus(ref.yourReferral.status) && (
            <div
              className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3"
              role="alert"
            >
              <p className="text-sm leading-relaxed text-amber-100/95">
                <span className="font-semibold text-amber-50/95">Why ineligible: </span>
                {ref.yourReferral.ineligibilityExplanation ||
                  INELIGIBILITY_EXPLANATION_FALLBACK}
              </p>
            </div>
          )}

          <div className="space-y-8">
          {ref.yourReferral && (
            <div
              className={cn(
                "card-glow border",
                isIneligibleStatus(ref.yourReferral.status)
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-cyan-500/20 bg-cyan-950/20"
              )}
            >
              <p className="text-xs font-medium text-zinc-400">You signed up with someone’s link</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">
                {formatM(
                  ref.yourReferral.displayProgressM ?? ref.yourReferral.progressVolumeM
                )}
                M
                <span className="text-base font-normal text-zinc-500">
                  {" "}
                  / {REFERRAL_VOLUME_THRESHOLD_M}M completed volume
                </span>
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                This is your running total from <strong className="text-zinc-400">completed</strong> sell orders
                (admin marks done). One order of 1M money = +1.0M here. The in-game thank-you for your
                referrer unlocks at {REFERRAL_VOLUME_THRESHOLD_M}M (not per order).
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card-glow text-center sm:text-left">
              <p className="text-xs text-zinc-500">Your code</p>
              <p className="mt-1 font-mono text-lg font-semibold text-violet-200">{code || "—"}</p>
            </div>
            <div className="card-glow">
              <p className="text-xs text-zinc-500">Open referrals (PENDING)</p>
              <p className="mt-0.5 text-[10px] text-zinc-600">Not completed 50M reward yet</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">{ref.referredPendingCount}</p>
            </div>
            <div className="card-glow">
              <p className="text-xs text-zinc-500">Rewards paid</p>
              <p className="mt-0.5 text-[10px] text-zinc-600">50M+ hit &amp; processed</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">{ref.referredCompletedRewards}</p>
            </div>
          </div>

          <div className="card-glow space-y-4">
            <div className="flex items-center gap-2 text-sm text-violet-200">
              <Share2 className="h-4 w-4 shrink-0" />
              <span>Your invite link</span>
            </div>
            <p className="text-xs text-zinc-500">
              Opens the sell page with your code pre-filled. One link for everyone you invite.
            </p>
            <p className="break-all rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2.5 font-mono text-sm text-zinc-300">
              {inviteLink || "—"}
            </p>
            <button
              type="button"
              onClick={() => void copyText(inviteLink, "Link copied")}
              disabled={!inviteLink}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Copy className="h-4 w-4" />
              Copy link
            </button>
          </div>

          <div className="card-glow space-y-3 text-sm text-zinc-400">
            <div className="flex items-center gap-2 text-zinc-200">
              <MessageCircle className="h-4 w-4 text-cyan-200/90" />
              <span>In-game name for rewards</span>
            </div>
            <p>
              Referral {ref.rewardInGame} is <strong className="text-zinc-300">not an automatic
              withdrawal</strong> — staff delivers it in-game (or via Discord) once your invitee
              hits the volume goal and the reward is approved.
            </p>
            {showIgnInput && (
              <p>
                {hasSavedIgn
                  ? "Update the name below if you use a different character or typo’d it."
                  : "Add your RuneScape in-game name so we know which account to pay."}
              </p>
            )}
            {!showIgnInput && hasSavedIgn && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-200/80">
                  Current in-game name
                </p>
                <p className="mt-0.5 font-mono text-base font-semibold text-zinc-100">
                  {savedIgn}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Referral gold will be sent to this name. Use change if you need a different
                  account.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIgnEditing(true);
                    setIgnDraft(ref.inGameName ?? "");
                  }}
                  className="mt-2 text-sm font-medium text-violet-300 hover:text-violet-200 hover:underline"
                >
                  Change in-game name
                </button>
              </div>
            )}
            {showIgnInput && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-500" htmlFor="ref-ign">
                  {hasSavedIgn ? "New in-game name" : "In-game name (IGN)"}
                </label>
                <input
                  id="ref-ign"
                  type="text"
                  autoComplete="nickname"
                  value={ignDraft}
                  onChange={(e) => setIgnDraft(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. MyMainName"
                  className="input-field"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => void saveIgn()}
                    disabled={savingIgn}
                    className="inline-flex items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
                  >
                    {savingIgn
                      ? "Saving…"
                      : hasSavedIgn
                        ? "Save new name"
                        : "Save in-game name"}
                  </button>
                  {hasSavedIgn && ignEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setIgnEditing(false);
                        setIgnDraft(ref.inGameName ?? "");
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void copyText(staffRewardMessage(), "Message copied — paste in Discord or ticket")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy text for staff / Discord
                  </button>
                </div>
              </div>
            )}
            {!showIgnInput && hasSavedIgn && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => void copyText(staffRewardMessage(), "Message copied — paste in Discord or ticket")}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 sm:w-auto"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy text for staff / Discord
                </button>
              </div>
            )}
          </div>

          <div className="card-glow space-y-3 text-sm text-zinc-400">
            <div className="flex items-center gap-2 text-zinc-200">
              <Gift className="h-4 w-4 text-amber-200/90" />
              <span>How rewards work</span>
            </div>
            <p>
              <strong className="text-zinc-300">Referrer only:</strong> when an invitee reaches{" "}
              <strong className="text-zinc-300">{ref.minVolumeMForReward}M</strong> total completed
              (equivalent) sell volume, you get a reward of <strong className="text-zinc-300">{ref.rewardInGame}</strong>{" "}
              in-game (delivered manually). Order must be <strong className="text-zinc-300">COMPLETED</strong> in
              the admin system for its volume to count.
            </p>
            {!ref.yourReferral && ref.invites?.length === 0 && (
              <p className="text-xs text-zinc-500">
                You don’t have a &quot;joined with a link&quot; row yet. Use a friend’s invite link at{" "}
                <strong>sign up</strong> (or guest checkout with a code) to link your account, or share your
                own link above; invitees you refer will show in the list below.
              </p>
            )}
          </div>

          {(ref.invites ?? []).length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-200">People who used your link</h2>
              <p className="text-xs text-zinc-500">
                Each row is one person: when they used your code, their last login, and whether they
                have completed a sell. Reward volume updates when <strong>their</strong> orders are
                completed. You will be notified when one of them hits {REFERRAL_VOLUME_THRESHOLD_M}M.
              </p>
              <ul className="space-y-2">
                {(ref.invites ?? []).map((inv) => (
                  <li key={inv._id} className="card-glow text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-zinc-100">{inv.displayName}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Used your link{" "}
                          <time dateTime={inv.signedUpAt}>{formatDateTime(inv.signedUpAt)}</time>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                          inv.status === "REWARDED" && "bg-emerald-500/15 text-emerald-200/90",
                          inv.status === "PENDING" && "bg-zinc-800 text-zinc-400",
                          isIneligibleStatus(inv.status) && "bg-amber-500/10 text-amber-200/80"
                        )}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 pt-2 text-xs text-zinc-500">
                      <span>
                        Last login:{" "}
                        {inv.lastActiveAt ? (
                          <time dateTime={inv.lastActiveAt} className="text-zinc-300">
                            {formatDateTime(inv.lastActiveAt)}
                          </time>
                        ) : (
                          <span className="text-zinc-500">Not yet</span>
                        )}
                      </span>
                      <span>
                        Sell completed:{" "}
                        {inv.hasCompletedTrade ? (
                          <span className="font-medium text-emerald-300/90">Yes</span>
                        ) : (
                          <span className="text-zinc-500">No</span>
                        )}
                      </span>
                      <span>
                        Their IG:{" "}
                        <span className="text-zinc-300">
                          {inv.referredInGameName?.trim() || "—"}
                        </span>
                      </span>
                      <span className="font-mono text-zinc-300">
                        {formatM(inv.displayProgressM ?? inv.progressVolumeM)}M /{" "}
                        {REFERRAL_VOLUME_THRESHOLD_M}M
                        {String(inv.status).toUpperCase() === "REWARDED" && (
                          <span className="ml-1 font-sans text-[10px] font-normal text-emerald-500/90">
                            (goal met)
                          </span>
                        )}
                      </span>
                    </div>
                    {isIneligibleStatus(inv.status) && (
                      <p className="mt-2 border-t border-amber-500/15 pt-2 text-xs leading-relaxed text-amber-200/85">
                        <span className="font-medium text-amber-100/80">Why ineligible: </span>
                        {inv.ineligibilityExplanation || INELIGIBILITY_EXPLANATION_FALLBACK}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
        </>
      )}

      <p className="text-center text-sm">
        <Link2 className="mr-1 inline h-3.5 w-3.5 text-zinc-600" />
        <Link href="/dashboard" className="text-violet-400 hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
