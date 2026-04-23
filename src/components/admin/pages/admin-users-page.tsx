"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { formatInr } from "@/lib/utils";
import { AdminPageHeader, TableShell } from "../ui";

function StaffSkillsField({
  initial,
  onSave,
}: {
  initial: string[];
  onSave: (skills: string[]) => void;
}) {
  const [v, setV] = useState(initial.join(", "));
  const [saving, setSaving] = useState(false);
  return (
    <div className="max-w-[14rem] space-y-1">
      <p className="text-[9px] leading-tight text-zinc-600">
        Item slugs for SKILL auto-assign, or * for all. Comma-separated.
      </p>
      <div className="flex gap-1">
        <input
          className="min-w-0 flex-1 rounded border border-white/10 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px]"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="e.g. 1m, *"
        />
        <button
          type="button"
          className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-300"
          disabled={saving}
          onClick={() => {
            setSaving(true);
            const skills = v
              .split(/[,\s]+/)
              .map((s) => s.trim())
              .filter(Boolean);
            onSave(skills);
            setSaving(false);
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

type Row = {
  _id: string;
  name: string;
  email: string;
  role: string;
  sellerTier: string;
  lifetimeVolumeSold: number;
  orderCount: number;
  totalSoldInr: number;
  referralCount: number;
  lastActiveAt?: string;
  riskFlags: string[];
  riskScore: number;
  banned: boolean;
  isVip: boolean;
  referralCodeDisabled: boolean;
  assignmentSkills: string[];
};

export function AdminUsersPage() {
  const { data: session } = useSession();
  const me = session?.user?.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/users");
    if (r.ok) setRows((await r.json()) as Row[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(
    id: string,
    body: Record<string, unknown>
  ) {
    const r = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, ...body }),
    });
    if (!r.ok) toast.error("Update failed");
    else {
      toast.success("Updated");
      void load();
    }
  }

  const filtered = rows.filter(
    (r) =>
      !search ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <AdminPageHeader title="User management" desc="Sellers, VIPs, and risk in one place." />
      <input
        className="mb-4 w-full max-w-sm rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
        placeholder="Search email or name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <TableShell>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Email / name</th>
              <th className="p-2">Role</th>
              <th className="p-2">Tier</th>
              <th className="p-2">Orders</th>
              <th className="p-2">Vol M</th>
              <th className="p-2">Sold</th>
              <th className="p-2">Refs</th>
              <th className="p-2">Last active</th>
              <th className="p-2">Risk</th>
              <th className="p-2 w-48">Staff skills</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {filtered.map((u) => (
              <tr key={u._id} className="border-t border-white/5">
                <td className="p-2 font-mono text-[10px] text-zinc-500">{u._id.slice(-8)}</td>
                <td className="p-2">
                  <div className="text-sm">{u.email}</div>
                  <div className="text-xs text-zinc-500">{u.name}</div>
                </td>
                <td className="p-2 text-xs text-zinc-500">
                  {u.role === "ADMIN" ? (
                    <span className="text-amber-200/80">ADMIN (change in database)</span>
                  ) : u._id === me ? (
                    <span title="Use another admin to change your role">{u.role}</span>
                  ) : (
                    <select
                      className="max-w-[7rem] rounded border border-white/10 bg-zinc-950 px-1 py-0.5 text-[10px] uppercase"
                      value={u.role === "STAFF" ? "STAFF" : "USER"}
                      onChange={(e) => {
                        const v = e.target.value as "USER" | "STAFF";
                        if (v === u.role) return;
                        void patch(u._id, { role: v });
                      }}
                    >
                      <option value="USER">USER</option>
                      <option value="STAFF">STAFF</option>
                    </select>
                  )}
                </td>
                <td className="p-2 text-xs">{u.sellerTier}</td>
                <td className="p-2 font-mono text-xs">{u.orderCount}</td>
                <td className="p-2 font-mono text-xs">{u.lifetimeVolumeSold}</td>
                <td className="p-2 font-mono text-xs">{formatInr(u.totalSoldInr)}</td>
                <td className="p-2 text-xs">{u.referralCount}</td>
                <td className="p-2 text-[10px] text-zinc-500">
                  {u.lastActiveAt
                    ? new Date(u.lastActiveAt).toLocaleString()
                    : "—"}
                </td>
                <td className="p-2 text-xs">{u.riskScore}</td>
                <td className="p-2 align-top text-[10px] text-zinc-500">
                  {u.role === "STAFF" || u.role === "ADMIN" ? (
                    <StaffSkillsField
                      key={u._id + (u.assignmentSkills?.join() ?? "")}
                      initial={u.assignmentSkills}
                      onSave={(skills) => void patch(u._id, { assignmentSkills: skills })}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      href={`/admin/orders?user=${u._id}`}
                      className="text-[10px] text-violet-300"
                    >
                      Orders
                    </Link>
                    <button
                      type="button"
                      className="text-[10px] text-zinc-400"
                      onClick={() => void patch(u._id, { banned: !u.banned })}
                    >
                      {u.banned ? "Unban" : "Ban"}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-zinc-400"
                      onClick={() => void patch(u._id, { isVip: !u.isVip })}
                    >
                      {u.isVip ? "Un-VIP" : "VIP"}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-amber-400/80"
                      onClick={() => void patch(u._id, { clearReferralAbuse: true })}
                    >
                      Clear ref. abuse
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
