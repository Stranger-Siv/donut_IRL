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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Staff</h1>
        <p className="text-sm text-zinc-500">Orders assigned to you.</p>
      </div>
      {orders.length === 0 && (
        <p className="text-sm text-zinc-500">No assigned orders right now.</p>
      )}
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o._id}>
            <Link
              href={`/orders/${o._id}`}
              className="card-glow flex justify-between gap-2 border border-cyan-500/10 transition hover:border-cyan-500/30"
            >
              <span>
                {o.itemName} ×{o.quantity}
              </span>
              <span className="font-mono text-cyan-200">
                {formatInr(o.payoutAmount)} · {o.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
