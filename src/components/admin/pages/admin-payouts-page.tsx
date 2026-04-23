"use client";

import { useCallback, useEffect, useState } from "react";
import { formatInr } from "@/lib/utils";
import { AdminPageHeader, TableShell } from "../ui";

type Row = {
  _id: string;
  userEmail: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
  updatedAt: string;
};

export function AdminPayoutsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/payouts");
    if (r.ok) setRows((await r.json()) as Row[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader
        title="Payout management"
        desc="UPI, bank, and crypto rails — reference IDs, timing, and stuck states from orders."
      />
      <TableShell>
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="p-2">Order</th>
              <th className="p-2">User</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Method</th>
              <th className="p-2">Status</th>
              <th className="p-2">Ref</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((o) => (
              <tr key={o._id} className="border-t border-white/5">
                <td className="p-2 font-mono text-xs">{o._id.slice(-8)}</td>
                <td className="p-2 text-xs">{o.userEmail}</td>
                <td className="p-2 font-mono text-violet-200">{formatInr(o.amount)}</td>
                <td className="p-2 text-xs">{o.method}</td>
                <td className="p-2 text-xs">{o.status}</td>
                <td className="p-2 text-[10px] text-zinc-500">{o.reference || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
