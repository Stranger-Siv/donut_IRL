"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminIneligibleSourceLabel, explainIneligibility } from "@/lib/referral-ineligible";
import { AdminPageHeader, TableShell, StatGrid } from "../ui";

type Item = {
  _id: string;
  code: string;
  status: string;
  progressVolumeM: number;
  rewardReferrerGiven: boolean;
  rewardMillionIg?: string;
  referrerEmail?: string;
  referredEmail?: string;
  referrerInGameName?: string;
  referredInGameName?: string;
  referrerPayoutDeliveredAt?: string | null;
  ineligibleReason?: string;
  ineligibleUserMessage?: string;
  adminNote?: string;
};

export function AdminReferralsPage() {
  const [data, setData] = useState<{
    summary: object;
    items: Item[];
    payoutsPending: Item[];
  } | null>(null);
  const [markIneligibleId, setMarkIneligibleId] = useState<string | null>(null);
  const [publicIneligible, setPublicIneligible] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/referrals", { cache: "no-store", credentials: "include" });
    if (r.ok) setData(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    id: string,
    action:
      | "approve_reward"
      | "set_ineligible"
      | "disable_referrer_code"
      | "mark_referrer_payout_delivered"
  ) {
    const body: {
      referralId: string;
      action: string;
      publicIneligibleMessage?: string;
    } = { referralId: id, action };
    if (action === "set_ineligible") {
      body.publicIneligibleMessage = publicIneligible.trim();
    }
    const r = await fetch("/api/admin/referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) toast.error("Failed");
    else {
      toast.success("OK");
      setMarkIneligibleId(null);
      setPublicIneligible("");
      void load();
    }
  }

  const s = data?.summary as
    | { total?: number; successful?: number; pending?: number }
    | undefined;

  const statItems = s
    ? [
        { label: "Total", value: String(s.total ?? 0) },
        { label: "Rewarded", value: String(s.successful ?? 0) },
        { label: "Pending", value: String(s.pending ?? 0) },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Referral program"
        desc="Ineligible: Source = internal reason; Users see = public text on /referrals. IGN: referrers save it on their Referrals page (user field inGameName). Pay in-game using Referrer IGN, then use Mark paid in-game so the queue clears."
      />
      <div className="mb-6">
        <StatGrid items={statItems} loading={!data} />
      </div>

      {data && (
        <div className="mb-6 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <h2 className="text-sm font-semibold text-emerald-100/95">Referral payouts (in-game)</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            <strong className="text-zinc-400">Where the names come from:</strong>{" "}
            <strong className="text-zinc-400">Referrer IG</strong> and <strong className="text-zinc-400">Referred IG</strong> are
            each user&apos;s saved in-game name from the public <strong className="text-zinc-400">Referrals</strong> page (or
            PATCH <span className="font-mono text-zinc-600">/api/user/me</span>). If you see &quot;not set&quot;, ask them to
            save it on Referrals before paying.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            <strong className="text-zinc-400">How to pay:</strong> Rows here are <strong className="text-zinc-400">REWARDED</strong>{" "}
            (50M+ met and approved) but <strong className="text-zinc-400">not</strong> yet marked paid in-game. Send the{" "}
            <strong className="text-zinc-400">M</strong> amount in-game to the <strong className="text-zinc-400">referrer</strong>{" "}
            (not the referred user), then click <strong className="text-zinc-400">Mark paid in-game</strong>.
          </p>
          {(data.payoutsPending?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              No pending in-game payouts — either nothing is REWARDED yet, or everything is already marked paid.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-[11px] font-medium uppercase text-zinc-500">
                  <tr>
                    <th className="p-2">Referrer (login)</th>
                    <th className="p-2">Referrer IGN</th>
                    <th className="p-2">Referred (login)</th>
                    <th className="p-2">Referred IG</th>
                    <th className="p-2">Code</th>
                    <th className="p-2">M</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payoutsPending.map((r) => (
                    <tr key={r._id} className="border-t border-white/10 text-zinc-300">
                      <td className="p-2 text-xs text-zinc-400">{r.referrerEmail ?? "—"}</td>
                      <td className="p-2 font-mono text-xs text-emerald-200/90">
                        {r.referrerInGameName?.trim() || "— not set —"}
                      </td>
                      <td className="p-2 text-xs text-zinc-400">{r.referredEmail ?? "—"}</td>
                      <td className="p-2 font-mono text-xs text-zinc-500">
                        {r.referredInGameName?.trim() || "—"}
                      </td>
                      <td className="p-2 font-mono text-[11px] text-zinc-500">{r.code}</td>
                      <td className="p-2 font-mono text-xs text-zinc-400">
                        {r.rewardMillionIg ?? "5"}M
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => void act(r._id, "mark_referrer_payout_delivered")}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-500"
                        >
                          Mark paid in-game
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {markIneligibleId && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-950/20 p-4 text-sm text-zinc-200">
          <p className="font-medium text-amber-200/90">Mark referral ineligible</p>
          <p className="mt-1 text-xs text-zinc-500">
            Optional: short text shown to the referrer and invitee on the Referrals page (max 500 characters).
            Leave empty to use the default support message.
          </p>
          <textarea
            className="mt-2 w-full min-h-[80px] rounded border border-white/10 bg-zinc-950/80 p-2 text-sm text-zinc-200"
            placeholder="e.g. Pattern matched duplicate accounts. Contact us to appeal."
            value={publicIneligible}
            maxLength={500}
            onChange={(e) => setPublicIneligible(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
              onClick={() => void act(markIneligibleId, "set_ineligible")}
            >
              Confirm ineligible
            </button>
            <button
              type="button"
              className="rounded border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5"
              onClick={() => {
                setMarkIneligibleId(null);
                setPublicIneligible("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <TableShell>
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="p-2">Code</th>
              <th className="p-2">Referrer</th>
              <th className="p-2">Ref. IG</th>
              <th className="p-2">Referred</th>
              <th className="p-2">Progress M</th>
              <th className="p-2">Status</th>
              <th className="p-2 min-w-[280px] max-w-md">Ineligible (why)</th>
              <th className="p-2">Payout</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((r) => (
              <tr key={r._id} className="border-t border-white/5 text-zinc-300">
                <td className="p-2 font-mono text-xs">{r.code}</td>
                <td className="p-2 text-xs">{r.referrerEmail}</td>
                <td className="p-2 font-mono text-[11px] text-zinc-500">
                  {r.referrerInGameName?.trim() || "—"}
                </td>
                <td className="p-2 text-xs">{r.referredEmail}</td>
                <td className="p-2 font-mono text-xs">{r.progressVolumeM}</td>
                <td className="p-2 text-xs">{r.status}</td>
                <td className="p-2 align-top text-[11px] leading-relaxed text-zinc-400">
                  {r.status === "INELIGIBLE" ? (
                    <div className="space-y-1.5">
                      <p>
                        <span className="text-zinc-500">Source · </span>
                        {adminIneligibleSourceLabel(r.ineligibleReason)}
                      </p>
                      <p>
                        <span className="text-zinc-500">Users see · </span>
                        {explainIneligibility(
                          "INELIGIBLE",
                          r.ineligibleReason,
                          r.ineligibleUserMessage
                        )}
                      </p>
                      {r.adminNote?.trim() ? (
                        <p className="text-zinc-500">
                          <span className="text-zinc-600">Internal · </span>
                          {r.adminNote.trim()}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="p-2 text-[10px] text-zinc-500">
                  {r.status === "REWARDED" && r.referrerPayoutDeliveredAt ? (
                    <span className="text-emerald-500/90" title={r.referrerPayoutDeliveredAt}>
                      Paid
                    </span>
                  ) : r.status === "REWARDED" ? (
                    <span className="text-amber-500/80">Pending</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="text-[10px] text-emerald-400"
                      onClick={() => void act(r._id, "approve_reward")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-amber-400"
                      onClick={() => {
                        setMarkIneligibleId(r._id);
                        setPublicIneligible((r.ineligibleUserMessage as string) || "");
                      }}
                    >
                      Ineligible
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-zinc-500"
                      onClick={() => void act(r._id, "disable_referrer_code")}
                    >
                      Disable code
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
