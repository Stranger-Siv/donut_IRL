"use client";

import { AdminPageHeader } from "../ui";

const links = [
  { label: "Orders CSV", href: "/api/admin/export?type=orders" },
  { label: "Users CSV", href: "/api/admin/export?type=users" },
  { label: "Referrals CSV", href: "/api/admin/export?type=referrals" },
];

export function AdminExportsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Exports and reports"
        desc="Point-in-time CSV exports (profit rollups: derive from your accounting export)."
      />
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="text-violet-300 underline decoration-violet-500/30 hover:decoration-violet-400"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
