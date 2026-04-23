"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "../ui";

type C = {
  heroTitle: string;
  heroSubtitle: string;
  announcementBar: string;
  promoBanner: string;
  faqMarkdown: string;
  termsMarkdown: string;
  footerLinks: { label: string; href: string }[];
};

const empty: C = {
  heroTitle: "",
  heroSubtitle: "",
  announcementBar: "",
  promoBanner: "",
  faqMarkdown: "",
  termsMarkdown: "",
  footerLinks: [],
};

export function AdminContentPage() {
  const [c, setC] = useState<C | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/content");
    if (r.ok) {
      const j = (await r.json()) as C;
      setC({ ...empty, ...j, footerLinks: j.footerLinks || [] });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!c) return;
    const r = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    });
    if (!r.ok) toast.error("Save failed");
    else toast.success("Saved (wire to public site when ready)");
  }

  if (!c) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-4 max-w-3xl">
      <AdminPageHeader
        title="Content management"
        desc="Hero, announcements, FAQ, terms, footer — connect to public pages in a follow-up."
      />
      {(
        [
          ["heroTitle", "Hero title"],
          ["heroSubtitle", "Hero subtitle"],
          ["announcementBar", "Announcement bar"],
          ["promoBanner", "Promo banner"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="block text-sm">
          <span className="text-zinc-500">{label}</span>
          <input
            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={c[k]}
            onChange={(e) => setC((x) => (x ? { ...x, [k]: e.target.value } : x))}
          />
        </label>
      ))}
      {(
        [
          ["faqMarkdown", "FAQ (markdown)"],
          ["termsMarkdown", "Terms (markdown)"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="block text-sm">
          <span className="text-zinc-500">{label}</span>
          <textarea
            rows={5}
            className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 font-mono text-xs"
            value={c[k]}
            onChange={(e) => setC((x) => (x ? { ...x, [k]: e.target.value } : x))}
          />
        </label>
      ))}
      <p className="text-xs text-zinc-500">Footer links: edit JSON in DB or add UI later.</p>
      <button
        type="button"
        onClick={() => void save()}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm"
      >
        Save content
      </button>
    </div>
  );
}
