"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "../ui";

export function AdminNotifyPage() {
  const [title, setTitle] = useState("Platform update");
  const [message, setMessage] = useState("We’ve adjusted buy rates. Check the board.");
  const [type, setType] = useState<"price" | "promo" | "referral" | "maintenance" | "info">(
    "info"
  );
  const [audience, setAudience] = useState<"all" | "vip" | "inactive" | "one">("all");
  const [userId, setUserId] = useState("");

  async function send() {
    const r = await fetch("/api/admin/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message,
        type,
        audience,
        userId: audience === "one" ? userId : undefined,
      }),
    });
    const j = await r.json();
    if (!r.ok) toast.error(j.error || "Failed");
    else toast.success(`Sent to ${j.count} users`);
  }

  return (
    <div className="max-w-xl space-y-4">
      <AdminPageHeader
        title="In-app notifications"
        desc="Fan-out to user notification inbox (up to 2000 for broadcast)."
      />
      <label className="block text-sm text-zinc-500">
        Audience
        <select
          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
          value={audience}
          onChange={(e) => setAudience(e.target.value as typeof audience)}
        >
          <option value="all">All users</option>
          <option value="vip">VIP</option>
          <option value="inactive">Inactive (30d+)</option>
          <option value="one">Specific user</option>
        </select>
      </label>
      {audience === "one" && (
        <input
          className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
          placeholder="User Mongo ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      )}
      <label className="block text-sm text-zinc-500">
        Type
        <select
          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="price">Price</option>
          <option value="promo">Promo</option>
          <option value="referral">Referral</option>
          <option value="maintenance">Maintenance</option>
          <option value="info">Info</option>
        </select>
      </label>
      <input
        className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        rows={4}
        className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        type="button"
        onClick={() => void send()}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm"
      >
        Send notifications
      </button>
    </div>
  );
}
