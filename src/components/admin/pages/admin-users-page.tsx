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
    <div className="w-full min-w-0 max-w-full space-y-1">
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
        <table className="w-full min-w-0 table-fixed border-collapse text-left text-[10px] sm:text-xs">
          <thead className="text-zinc-500">
            <tr>
              <th className="w-[6%] p-1 sm:p-1.5">ID</th>
              <th className="w-[18%] p-1 sm:p-1.5">Email / name</th>
              <th className="w-[7%] p-1 sm:p-1.5">Role</th>
              <th className="w-[6%] p-1 sm:p-1.5">Tier</th>
              <th className="w-[4%] p-1 sm:p-1.5">Ord</th>
              <th className="w-[4%] p-1 sm:p-1.5">M</th>
              <th className="w-[7%] p-1 sm:p-1.5">₹</th>
              <th className="w-[3%] p-1 sm:p-1.5">R</th>
              <th className="w-[8%] p-1 sm:p-1.5">Last</th>
              <th className="w-[3%] p-1 sm:p-1.5">Rsk</th>
              <th className="w-[20%] p-1 sm:p-1.5">Skills</th>
              <th className="w-[14%] p-1 sm:p-1.5">Act</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {filtered.map((u) => (
              <tr key={u._id} className="border-t border-white/5">
                <td className="min-w-0 p-1 align-top font-mono text-[9px] text-zinc-500 sm:p-1.5">
                  {u._id.slice(-8)}
                </td>
                <td className="min-w-0 max-w-0 p-1 align-top sm:p-1.5">
                  <div className="line-clamp-2 break-all text-[10px] leading-tight sm:text-xs" title={u.email}>
                    {u.email}
                  </div>
                  <div className="line-clamp-1 break-words text-[9px] text-zinc-500">{u.name}</div>
                </td>
                <td className="min-w-0 p-1 align-top text-zinc-500 sm:p-1.5">
                  {u.role === "ADMIN" ? (
                    <span className="text-amber-200/80">ADMIN (change in database)</span>
                  ) : u._id === me ? (
                    <span title="Use another admin to change your role">{u.role}</span>
                  ) : (
                    <select
                      className="w-full min-w-0 max-w-full rounded border border-white/10 bg-zinc-950 py-0.5 pl-0.5 text-[8px] uppercase sm:text-[10px]"
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
                <td className="min-w-0 p-1 align-top text-[9px] sm:p-1.5 sm:text-xs">{u.sellerTier}</td>
                <td className="min-w-0 p-1 align-top font-mono text-[9px] sm:p-1.5 sm:text-xs">
                  {u.orderCount}
                </td>
                <td className="min-w-0 p-1 align-top font-mono text-[9px] sm:p-1.5 sm:text-xs">
                  {u.lifetimeVolumeSold}
                </td>
                <td className="min-w-0 p-1 align-top font-mono text-[8px] leading-tight sm:p-1.5 sm:text-xs">
                  {formatInr(u.totalSoldInr)}
                </td>
                <td className="min-w-0 p-1 align-top text-[9px] sm:p-1.5 sm:text-xs">{u.referralCount}</td>
                <td className="min-w-0 max-w-0 p-1 align-top text-[8px] leading-tight text-zinc-500 sm:p-1.5 sm:text-[10px]">
                  <span className="line-clamp-2 break-words" title={u.lastActiveAt || ""}>
                    {u.lastActiveAt
                      ? new Date(u.lastActiveAt).toLocaleString()
                      : "—"}
                  </span>
                </td>
                <td className="min-w-0 p-1 align-top text-[9px] sm:p-1.5 sm:text-xs">{u.riskScore}</td>
                <td className="min-w-0 max-w-0 p-1 align-top text-zinc-500 sm:p-1.5">
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
                <td className="min-w-0 p-1 align-top sm:p-1.5">
                  <div className="flex min-w-0 flex-wrap gap-0.5">
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
