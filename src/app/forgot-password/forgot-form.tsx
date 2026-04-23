"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";

function Inner() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    if (!res.ok) {
      toast.error(data.error || "Could not send reset email");
      return;
    }
    setSubmitted(true);
    toast.success(data.message || "Check your email");
  }

  if (submitted) {
    return (
      <div className="card-glow space-y-4 p-1">
        <p className="text-sm text-zinc-300">
          If that email is registered, we sent a link. Check your inbox and spam. The link works for about 1
          hour.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-violet-400 hover:underline"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card-glow space-y-4">
      <p className="text-sm leading-relaxed text-zinc-400">
        Enter the email for your account. We&apos;ll send a one-time link to set a new password.
      </p>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary disabled:cursor-not-allowed">
        {loading ? "…" : "Send reset link"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="text-violet-400 hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-zinc-800/40" />}>
      <Inner />
    </Suspense>
  );
}
