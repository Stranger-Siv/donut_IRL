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
        <table className="w-full min-w-0 table-fixed text-left text-xs sm:text-sm">
          <thead className="text-[10px] text-zinc-500 sm:text-xs">
            <tr>
              <th className="w-[10%] p-1.5 sm:p-2">Order</th>
              <th className="w-[24%] p-1.5 sm:p-2">User</th>
              <th className="w-[12%] p-1.5 sm:p-2">Amount</th>
              <th className="w-[10%] p-1.5 sm:p-2">Method</th>
              <th className="w-[12%] p-1.5 sm:p-2">Status</th>
              <th className="w-[32%] p-1.5 sm:p-2">Ref</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((o) => (
              <tr key={o._id} className="border-t border-white/5">
                <td className="min-w-0 p-1.5 font-mono text-[10px] sm:p-2 sm:text-xs">{o._id.slice(-8)}</td>
                <td className="min-w-0 max-w-0 p-1.5 sm:p-2">
                  <span className="line-clamp-2 break-all text-[10px] sm:text-xs" title={o.userEmail}>
                    {o.userEmail}
                  </span>
                </td>
                <td className="min-w-0 p-1.5 font-mono text-[10px] text-violet-200 sm:p-2 sm:text-xs">
                  {formatInr(o.amount)}
                </td>
                <td className="min-w-0 p-1.5 text-[10px] sm:p-2 sm:text-xs">{o.method}</td>
                <td className="min-w-0 p-1.5 text-[10px] sm:p-2 sm:text-xs">{o.status}</td>
                <td className="min-w-0 max-w-0 p-1.5 text-[9px] text-zinc-500 sm:p-2 sm:text-[10px]">
                  <span className="line-clamp-2 break-all" title={o.reference}>
                    {o.reference || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
