"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatInr } from "@/lib/utils";
import { AdminPageHeader, TableShell } from "../ui";
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

  return (
    <div>
      <AdminPageHeader
        title="Order management"
        desc="Filter, triage, and update pipeline statuses. High-value and sensitive orders surface here first."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/5 bg-zinc-900/30 p-4">
        <label className="text-xs text-zinc-500">
          Status
          <select
            className="mt-1 block rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
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
        <label className="text-xs text-zinc-500">
          Item type
          <select
            className="mt-1 block rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="CURRENCY">CURRENCY</option>
            <option value="ITEM">ITEM</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={highValue}
            onChange={(e) => setHighValue(e.target.checked)}
          />
          High value (₹5k+)
        </label>
        <label className="text-xs text-zinc-500">
          From
          <input
            type="date"
            className="mt-1 block rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs text-zinc-500">
          To
          <input
            type="date"
            className="mt-1 block rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="text-xs text-zinc-500">
          User ID
          <input
            className="mt-1 block w-40 rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 font-mono text-xs"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Filter…"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm"
        >
          Apply
        </button>
      </div>

      <TableShell>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Item</th>
              <th className="p-3 font-medium">Qty</th>
              <th className="p-3 font-medium">Payout</th>
              <th className="p-3 font-medium">Method</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Staff</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o._id} className="border-t border-white/5">
                  <td className="p-2 font-mono text-xs text-violet-300/90">
                    {o._id.slice(-8)}
                  </td>
                  <td className="p-2 max-w-[160px] truncate text-xs" title={o.userEmail}>
                    {o.userEmail}
                  </td>
                  <td className="p-2">
                    {o.itemName}
                    {o.itemType && (
                      <span className="ml-1 text-[10px] text-zinc-600">({o.itemType})</span>
                    )}
                  </td>
                  <td className="p-2 font-mono text-xs">{o.quantity}</td>
                  <td className="p-2 font-mono text-violet-200">{formatInr(o.payoutAmount)}</td>
                  <td className="p-2 text-xs">{o.payoutMethod}</td>
                  <td className="p-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] uppercase",
                        o.status === "COMPLETED" && "bg-emerald-500/15 text-emerald-300",
                        o.status === "CANCELLED" && "bg-red-500/10 text-red-300",
                        o.status === "HOLD" && "bg-amber-500/15 text-amber-200"
                      )}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-zinc-500">{o.assignedName ?? "—"}</td>
                  <td className="p-2 text-[10px] text-zinc-500">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Link
                        href={`/admin/orders/${o._id}`}
                        className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] hover:border-violet-500/40"
                      >
                        View
                      </Link>
                      <select
                        className="max-w-[100px] rounded border border-white/10 bg-zinc-950 text-[10px]"
                        value=""
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
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
