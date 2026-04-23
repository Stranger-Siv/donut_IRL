"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatInr } from "@/lib/utils";
import { AdminPageHeader, TableShell } from "../ui";
import { AdminTableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Row = {
  _id: string;
  userEmail: string;
  userName: string;
  itemName: string;
  itemType?: string;
  quantity: number;
  payoutAmount: number;
  payoutMethod: string;
  status: string;
  createdAt: string;
  assignedName: string | null;
  payoutReference: string;
};

const STATUSES = [
  "all",
  "PENDING",
  "ASSIGNED",
  "RECEIVED",
  "PAID",
  "HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("all");
  const [itemType, setItemType] = useState("all");
  const [highValue, setHighValue] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = searchParams?.get("user");
    if (u) setUserId(u);
  }, [searchParams]);

  const q = useCallback(() => {
    const p = new URLSearchParams();
    if (status !== "all") p.set("status", status);
    if (itemType !== "all") p.set("itemType", itemType);
    if (highValue) p.set("highValue", "1");
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (userId.trim()) p.set("user", userId.trim());
    return p.toString();
  }, [status, itemType, highValue, from, to, userId]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/orders?${q()}`);
    if (r.ok) setRows((await r.json()) as Row[]);
    else toast.error("Failed to load orders");
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(id: string, next: string) {
    const r = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!r.ok) {
      toast.error("Update failed");
      return;
    }
    toast.success("Order updated");
    void load();
  }

  function statusBadge(st: string) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
          st === "COMPLETED" && "bg-emerald-500/15 text-emerald-300",
          st === "CANCELLED" && "bg-red-500/10 text-red-300",
          st === "HOLD" && "bg-amber-500/15 text-amber-200",
          st !== "COMPLETED" && st !== "CANCELLED" && st !== "HOLD" && "bg-zinc-800/50 text-zinc-300"
        )}
      >
        {st}
      </span>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-clip">
      <AdminPageHeader
        title="Order management"
        desc="Filter, triage, and update pipeline statuses. High-value and sensitive orders surface here first."
      />

      <div className="mb-4 flex min-w-0 max-w-full flex-col flex-wrap items-stretch gap-3 overflow-x-clip rounded-2xl border border-white/5 bg-zinc-900/30 p-3 sm:flex-row sm:items-end sm:p-4">
        <label className="w-full min-w-0 text-xs text-zinc-500 sm:w-auto">
          Status
          <select
            className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm sm:max-w-[11rem] sm:py-1.5"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="w-full min-w-0 text-xs text-zinc-500 sm:w-auto">
          Item type
          <select
            className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm sm:max-w-[10rem] sm:py-1.5"
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="CURRENCY">CURRENCY</option>
            <option value="ITEM">ITEM</option>
          </select>
        </label>
        <label className="flex w-full min-w-0 items-center gap-2 text-xs text-zinc-400 sm:w-auto">
          <input
            type="checkbox"
            checked={highValue}
            onChange={(e) => setHighValue(e.target.checked)}
            className="shrink-0"
          />
          <span className="min-w-0 break-words">High value (₹5k+)</span>
        </label>
        <label className="w-full min-w-0 text-xs text-zinc-500 sm:w-auto">
          From
          <input
            type="date"
            className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm sm:max-w-[11rem] sm:py-1.5"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="w-full min-w-0 text-xs text-zinc-500 sm:w-auto">
          To
          <input
            type="date"
            className="mt-1 block w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm sm:max-w-[11rem] sm:py-1.5"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="w-full min-w-0 text-xs text-zinc-500 sm:w-auto">
          User ID
          <input
            className="mt-1 block w-full min-w-0 rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 font-mono text-xs sm:max-w-[10rem]"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Filter…"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-10 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm sm:w-auto"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <div className="min-w-0 max-w-full">
          <AdminTableSkeleton rows={10} cols={6} />
        </div>
      ) : (
        <>
          <ul className="min-w-0 space-y-3 xl:hidden" aria-label="Orders list">
            {rows.map((o) => (
              <li
                key={o._id}
                className="min-w-0 max-w-full rounded-2xl border border-white/10 bg-zinc-900/50 p-3 text-sm"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p className="min-w-0 break-all font-mono text-xs text-violet-300/90">
                    …{o._id.slice(-8)}
                  </p>
                  {statusBadge(o.status)}
                </div>
                <p className="mt-1 min-w-0 break-words text-xs text-zinc-400" title={o.userEmail}>
                  {o.userEmail}
                </p>
                <p className="mt-2 min-w-0 break-words text-zinc-200">
                  {o.itemName}
                  {o.itemType && (
                    <span className="ml-1 text-[10px] text-zinc-500">({o.itemType})</span>
                  )}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-400 sm:grid-cols-3">
                  <div>
                    <dt className="text-zinc-600">Qty</dt>
                    <dd className="font-mono text-zinc-200">{o.quantity}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Payout</dt>
                    <dd className="font-mono text-violet-200">{formatInr(o.payoutAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Method</dt>
                    <dd className="text-zinc-200">{o.payoutMethod}</dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-zinc-600">Staff</dt>
                    <dd className="min-w-0 break-words text-zinc-300">{o.assignedName ?? "—"}</dd>
                  </div>
                  <div className="min-w-0 col-span-2 sm:col-span-1">
                    <dt className="text-zinc-600">Created</dt>
                    <dd className="min-w-0 break-words text-zinc-400">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/orders/${o._id}`}
                    className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200"
                  >
                    View
                  </Link>
                  <select
                    className="min-w-0 max-w-full flex-1 rounded-lg border border-white/10 bg-zinc-950 py-1.5 pl-2 text-xs"
                    value=""
                    aria-label="Set status"
                    onChange={(e) => {
                      const v = e.target.value;
                      e.target.value = "";
                      if (v) void patchStatus(o._id, v);
                    }}
                  >
                    <option value="">Set status…</option>
                    {STATUSES.filter((s) => s !== "all").map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden min-w-0 max-w-full xl:block">
            <TableShell>
              <table className="w-full min-w-0 max-w-full table-fixed border-collapse text-left text-xs text-zinc-300">
                <thead className="border-b border-white/5 text-[10px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="w-[7%] p-1.5 pr-0 font-medium">ID</th>
                    <th className="w-[18%] p-1.5 font-medium">User</th>
                    <th className="w-[12%] p-1.5 font-medium">Item</th>
                    <th className="w-[5%] p-1.5 font-medium">Qty</th>
                    <th className="w-[9%] p-1.5 font-medium">Payout</th>
                    <th className="w-[6%] p-1.5 font-medium">Method</th>
                    <th className="w-[10%] p-1.5 font-medium">Status</th>
                    <th className="w-[7%] p-1.5 font-medium">Staff</th>
                    <th className="w-[12%] p-1.5 font-medium">Created</th>
                    <th className="w-[14%] p-1.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o._id} className="border-t border-white/5">
                      <td className="min-w-0 p-1.5 align-top font-mono text-[10px] text-violet-300/90">
                        {o._id.slice(-8)}
                      </td>
                      <td className="min-w-0 max-w-0 p-1.5 align-top">
                        <span className="line-clamp-2 break-all" title={o.userEmail}>
                          {o.userEmail}
                        </span>
                      </td>
                      <td className="min-w-0 max-w-0 p-1.5 align-top">
                        <span className="line-clamp-2 break-words" title={o.itemName}>
                          {o.itemName}
                          {o.itemType && (
                            <span className="text-[9px] text-zinc-600"> ({o.itemType})</span>
                          )}
                        </span>
                      </td>
                      <td className="min-w-0 p-1.5 align-top font-mono text-[10px]">{o.quantity}</td>
                      <td className="min-w-0 p-1.5 align-top font-mono text-violet-200">
                        {formatInr(o.payoutAmount)}
                      </td>
                      <td className="min-w-0 p-1.5 align-top">{o.payoutMethod}</td>
                      <td className="min-w-0 p-1.5 align-top">{statusBadge(o.status)}</td>
                      <td className="min-w-0 max-w-0 p-1.5 align-top text-zinc-500">
                        <span className="line-clamp-2 break-words" title={o.assignedName ?? ""}>
                          {o.assignedName ?? "—"}
                        </span>
                      </td>
                      <td className="min-w-0 max-w-0 p-1.5 align-top text-[10px] text-zinc-500">
                        <span className="line-clamp-2 break-words" title={o.createdAt}>
                          {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                        </span>
                      </td>
                      <td className="min-w-0 p-1.5 align-top">
                        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap">
                          <Link
                            href={`/admin/orders/${o._id}`}
                            className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-center text-[10px] hover:border-violet-500/40"
                          >
                            View
                          </Link>
                          <select
                            className="min-w-0 max-w-full flex-1 rounded border border-white/10 bg-zinc-950 text-[10px]"
                            value=""
                            aria-label="Set status"
                            onChange={(e) => {
                              const v = e.target.value;
                              e.target.value = "";
                              if (v) void patchStatus(o._id, v);
                            }}
                          >
                            <option value="">Set…</option>
                            {STATUSES.filter((s) => s !== "all").map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </div>
        </>
      )}
    </div>
  );
}
