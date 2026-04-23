"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, TableShell } from "../ui";

type Row = {
  _id: string;
  name: string;
  email: string;
  role: string;
  activeOrders: number;
  completedToday: number;
  avgCompletionMinutes: number;
  failureRate: number;
};

export function AdminStaffPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/staff");
    if (r.ok) setRows((await r.json()) as Row[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader
        title="Staff and middlemen"
        desc="Per-handler throughput, SLAs, and quality signals (failure rate = cancelled on assigned work)."
      />
      <TableShell>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Role</th>
              <th className="p-2">Active</th>
              <th className="p-2">Done today</th>
              <th className="p-2">Avg time (m)</th>
              <th className="p-2">Cancel % on desk</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-white/5">
                <td className="p-2">
                  <div>{r.name}</div>
                  <div className="text-[10px] text-zinc-500">{r.email}</div>
                </td>
                <td className="p-2 text-xs">{r.role}</td>
                <td className="p-2 font-mono">{r.activeOrders}</td>
                <td className="p-2 font-mono">{r.completedToday}</td>
                <td className="p-2 font-mono">{r.avgCompletionMinutes}</td>
                <td className="p-2 font-mono">{r.failureRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
