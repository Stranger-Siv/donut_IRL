"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatInr } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { OrderViewResponse } from "@/lib/order-response";
import { OrderThread } from "@/components/orders/order-thread";
import { OrderDetailSkeleton } from "@/components/ui/skeleton";

const steps = [
  "PENDING",
  "ASSIGNED",
  "RECEIVED",
  "PAID",
  "COMPLETED",
] as const;

type Order = OrderViewResponse;

type StaffPick = { _id: string; email: string; name: string; role: string };

export function OrderTrackClient({
  id,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: {
  id: string;
  /** When opened from Admin → Orders, keep sidebar by using `/admin/orders`. */
  backHref?: string;
  backLabel?: string;
}) {
  const { data: s } = useSession();
  const [o, setO] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [users, setUsers] = useState<StaffPick[]>([]);
  const [aid, setAid] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [loadTick, setLoadTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.status === 401) {
        setUnauthorized(true);
        setO(null);
        return;
      }
      setUnauthorized(false);
      if (!res.ok) {
        setO(null);
        return;
      }
      setO((await res.json()) as Order);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const onOrderEvent = useCallback((next: Order) => {
    setO((prev) => (prev ? { ...prev, ...next } : null));
  }, []);

  useEffect(() => {
    void load();
  }, [load, loadTick]);

  useEffect(() => {
    if (o) {
      setStatus(o.status);
    }
  }, [o]);

  useEffect(() => {
    if (s?.user?.role === "ADMIN") {
      void fetch("/api/admin/users")
        .then((r) => r.json())
        .then((list) => {
          if (Array.isArray(list)) {
            setUsers(
              list
                .filter(
                  (u: { role: string }) => u.role === "STAFF" || u.role === "ADMIN"
                )
                .map((u: { _id: string; email: string; name: string; role: string }) => ({
                  _id: u._id,
                  email: u.email,
                  name: u.name,
                  role: u.role,
                }))
            );
          }
        });
    }
  }, [s?.user?.role]);

  const role = s?.user?.role;
  const isAdmin = role === "ADMIN";
  const isStaff = role === "STAFF" && o && o.assignedTo && s?.user?.id === o.assignedTo;
  const orderChatLocked = o?.status === "COMPLETED";
  const canPostInThread = !!(
    o &&
    !orderChatLocked &&
    s?.user &&
    (isAdmin ||
      s.user.id === o.userId ||
      (s.user.role === "STAFF" && o.assignedTo && s.user.id === o.assignedTo))
  );

  async function addEvidenceFile(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const u = await fetch(`/api/orders/${id}/messages/upload`, { method: "POST", body: fd });
    if (!u.ok) {
      toast.error("Upload failed");
      return;
    }
    const j = (await u.json()) as { url?: string };
    if (!j.url) {
      toast.error("No file URL");
      return;
    }
    const p = await fetch(`/api/orders/${id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: j.url }),
    });
    if (!p.ok) {
      const e = (await p.json().catch(() => ({}))) as { error?: string };
      toast.error(e.error || "Could not add evidence");
      return;
    }
    toast.success("Evidence added");
    setLoadTick((n) => n + 1);
  }

  async function patch(body: object) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(e.error || "Update failed");
      return;
    }
    toast.success("Updated");
    setLoadTick((n) => n + 1);
  }

  if (loading) {
    return <OrderDetailSkeleton />;
  }
  if (unauthorized) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-400">Log in to view this order.</p>
        <Link
          href={`/login?callbackUrl=/orders/${id}`}
          className="inline-flex min-h-10 items-center rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Log in
        </Link>
      </div>
    );
  }
  if (!o) {
    return (
      <p className="text-sm text-zinc-500">
        Couldn&apos;t load this order, or you don&apos;t have access.
      </p>
    );
  }

  const isSeller = s?.user?.id === o.userId;
  const canAddEvidence =
    (isSeller || isAdmin || isStaff) && !["COMPLETED", "CANCELLED"].includes(o.status);
  const stepIdx = steps.findIndex((x) => x === o.status);

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-balance text-xl font-semibold sm:text-2xl">Order</h1>
        <p className="font-mono text-xs text-zinc-500">{o._id}</p>
      </div>

      <ol className="flex flex-wrap gap-1 text-xs">
        {steps.map((st, i) => (
          <li
            key={st}
            className={cn(
              "rounded-md px-2 py-1",
              o.status === st && "bg-violet-600/20 text-violet-200",
              stepIdx >= 0 && i < stepIdx && "text-emerald-400/90",
              o.status === "CANCELLED" && "opacity-30"
            )}
          >
            {st}
          </li>
        ))}
        {o.status === "CANCELLED" && (
          <li className="rounded-md bg-red-500/10 px-2 py-1 text-red-300">CANCELLED</li>
        )}
        {(o.status === "HOLD" || o.status === "REVIEW") && (
          <li
            className={cn(
              "rounded-md px-2 py-1",
              o.status === "REVIEW" && "bg-amber-500/20 text-amber-200",
              o.status === "HOLD" && "bg-amber-500/10 text-amber-200/80"
            )}
          >
            {o.status}
          </li>
        )}
      </ol>

      {(o.processingHint != null && o.processingHint !== "") ||
      o.queuePosition != null ? (
        <div className="card-glow space-y-1 rounded-lg border border-cyan-500/15 bg-cyan-950/20 p-3 text-sm text-cyan-100/90">
          {o.queuePosition != null && o.queuePosition > 0 && (
            <p className="text-xs">Queue position (approx.): {o.queuePosition}</p>
          )}
          {o.processingHint && <p className="text-sm leading-relaxed text-zinc-300">{o.processingHint}</p>}
        </div>
      ) : null}

      {o.autoCancelAt && o.status === "PENDING" && (
        <p className="text-xs text-amber-200/90">
          If still unclaimed, this order can auto-cancel after:{" "}
          <span className="font-mono text-amber-100/90">
            {new Date(o.autoCancelAt as unknown as string).toLocaleString()}
          </span>
        </p>
      )}

      {o.publicStaffNote && (isSeller || isStaff || isAdmin) && (
        <div className="rounded-lg border border-violet-500/25 bg-violet-950/20 p-3 text-sm text-violet-100/95">
          <p className="text-xs text-violet-300/80">Message from ops</p>
          <p className="mt-1 whitespace-pre-wrap text-zinc-200">{o.publicStaffNote}</p>
        </div>
      )}

      {o.cancelReason && o.status === "CANCELLED" && (
        <p className="text-sm text-zinc-500">Reason: {o.cancelReason}</p>
      )}

      {o.evidenceUrls && o.evidenceUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Case evidence</p>
          <div className="flex flex-wrap gap-2">
            {o.evidenceUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block h-20 w-20 overflow-hidden rounded border border-white/10"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="card-glow space-y-1 text-sm">
        <p>
          {o.itemName}{" "}
          <span className="text-zinc-500">
            ×{o.fulfilledQuantity < o.quantity ? `${o.fulfilledQuantity} / ${o.quantity}` : o.quantity}
          </span>
        </p>
        <p className="font-mono text-violet-200">{formatInr(o.payoutAmount)}</p>
        {o.originalPayoutInr != null && o.payoutAmount !== o.originalPayoutInr && (
          <p className="text-xs text-zinc-500">
            Original quote: {formatInr(o.originalPayoutInr)} (partial / adjusted)
          </p>
        )}
        <p>
          {o.payoutMethod} — <span className="break-all text-zinc-400">{o.payoutDetails}</span>
        </p>
        {o.staffNote && <p className="text-zinc-500">Staff: {o.staffNote}</p>}
        {o.adminNote && isAdmin && <p className="text-zinc-500">Admin: {o.adminNote}</p>}
      </div>

      {o && s?.user && (
        <OrderThread
          orderId={id}
          currentUserId={s.user.id}
          canPost={canPostInThread}
          readOnlyHint={
            orderChatLocked
              ? "This order is completed. The conversation is closed — you can read past messages but cannot post."
              : canPostInThread
                ? undefined
                : "You can read this thread but you cannot post on this order."
          }
          onOrderEvent={onOrderEvent}
        />
      )}

      {canAddEvidence && (
        <label className="block text-xs text-zinc-500">
          <span>Attach image to case file (up to 5 total)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="mt-1 block w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void addEvidenceFile(f);
            }}
          />
        </label>
      )}

      {s?.user?.id === o.userId && o.status === "PENDING" && (
        <button
          type="button"
          onClick={() => void patch({ cancel: true })}
          className="text-sm text-red-400 hover:underline"
        >
          Cancel order
        </button>
      )}

      {isStaff && o.status === "ASSIGNED" && (
        <div className="space-y-2">
          <button
            type="button"
            className="rounded-lg bg-cyan-600 px-3 py-2 text-sm"
            onClick={() => void patch({ status: "RECEIVED" })}
          >
            Mark received in-game
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="card-glow w-full min-w-0 max-w-full space-y-3 overflow-x-hidden text-sm">
          <h2 className="font-medium">Admin</h2>
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Assign to staff</span>
              <select
                className="block w-full min-w-0 max-w-full rounded-md border border-white/10 bg-zinc-950/80 px-2 py-2 text-sm sm:max-w-xs"
                value={aid}
                onChange={(e) => setAid(e.target.value)}
              >
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="min-h-10 shrink-0 rounded-md bg-amber-600/80 px-3 py-2 text-sm"
              onClick={() => {
                if (!aid) {
                  toast.error("Pick a staff or admin to assign");
                  return;
                }
                void patch({ status: "ASSIGNED", assignedTo: aid });
              }}
            >
              Assign
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Set status</span>
              <select
                className="block w-full min-w-0 max-w-full rounded-md border border-white/10 bg-zinc-950/80 px-2 py-2 text-sm sm:max-w-xs"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                "PENDING",
                "ASSIGNED",
                "RECEIVED",
                "PAID",
                "COMPLETED",
                "CANCELLED",
                "HOLD",
                "REVIEW",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              </select>
            </div>
            <button
              type="button"
              className="min-h-10 shrink-0 rounded-md bg-violet-600 px-3 py-2 text-sm"
              onClick={() => void patch({ status })}
            >
              Apply status
            </button>
          </div>
          <div className="space-y-2 border-t border-white/5 pt-3">
            <p className="text-xs text-zinc-500">Public note to seller (use Discord for disputes)</p>
            <textarea
              className="w-full min-w-0 rounded-md border border-white/10 bg-zinc-950/80 px-2 py-2 text-base sm:text-sm"
              rows={2}
              defaultValue={o.publicStaffNote}
              id="pub-note"
            />
            <button
              type="button"
              className="rounded-md bg-zinc-700 px-2 py-1.5 text-xs"
              onClick={() => {
                const el = document.getElementById("pub-note") as HTMLTextAreaElement | null;
                void patch({ publicStaffNote: el?.value ?? "" });
              }}
            >
              Save public note
            </button>
          </div>
          <div className="space-y-2 border-t border-white/5 pt-3">
            <p className="text-xs text-zinc-500">Partial line (set before marking paid/completed)</p>
            <div className="flex flex-wrap gap-2">
              <label className="text-xs text-zinc-500">
                Fulfilled qty
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="mt-0.5 block w-24 rounded border border-white/10 bg-zinc-950 px-1 py-0.5"
                  defaultValue={o.fulfilledQuantity}
                  id="p-fq"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Payout INR
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="mt-0.5 block w-28 rounded border border-white/10 bg-zinc-950 px-1 py-0.5"
                  defaultValue={o.payoutAmount}
                  id="p-pay"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Equiv. volume (M)
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="mt-0.5 block w-28 rounded border border-white/10 bg-zinc-950 px-1 py-0.5"
                  defaultValue={o.equivalentVolume}
                  id="p-vol"
                />
              </label>
            </div>
            <button
              type="button"
              className="rounded-md bg-emerald-700/80 px-2 py-1.5 text-xs"
              onClick={() => {
                const fq = (
                  document.getElementById("p-fq") as HTMLInputElement | null
                )?.valueAsNumber;
                const pay = (document.getElementById("p-pay") as HTMLInputElement | null)
                  ?.valueAsNumber;
                const vol = (document.getElementById("p-vol") as HTMLInputElement | null)
                  ?.valueAsNumber;
                const body: Record<string, number> = {};
                if (typeof fq === "number" && Number.isFinite(fq)) body.fulfilledQuantity = fq;
                if (typeof pay === "number" && Number.isFinite(pay)) body.payoutAmount = pay;
                if (typeof vol === "number" && Number.isFinite(vol)) body.equivalentVolume = vol;
                void patch(body);
              }}
            >
              Apply partial amounts
            </button>
          </div>
        </div>
      )}

      <Link href={backHref} className="text-sm text-violet-400 hover:underline">
        ← {backLabel}
      </Link>
    </div>
  );
}
