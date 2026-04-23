"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatInr } from "@/lib/utils";

type Order = {
  _id: string;
  userId: string;
  itemName: string;
  quantity: number;
  payoutAmount: number;
  status: string;
};

export function StaffClient() {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/staff/orders");
    if (res.ok) setOrders((await res.json()) as Order[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-balance text-xl font-semibold text-zinc-50 sm:text-2xl">Staff</h1>
        <p className="mt-1 text-sm text-zinc-500">Orders assigned to you.</p>
      </div>
      {orders.length === 0 && (
        <p className="text-sm text-zinc-500">No assigned orders right now.</p>
      )}
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o._id}>
            <Link
              href={`/orders/${o._id}`}
              className="card-glow flex min-w-0 flex-col gap-1 border border-cyan-500/10 p-3 transition hover:border-cyan-500/30 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-3"
            >
              <span className="min-w-0 break-words text-zinc-200">
                {o.itemName} ×{o.quantity}
              </span>
              <span className="shrink-0 font-mono text-sm text-cyan-200">
                {formatInr(o.payoutAmount)} · {o.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
