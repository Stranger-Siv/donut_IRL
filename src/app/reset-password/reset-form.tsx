"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

function Inner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token") || "";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    if (password !== password2) {
      toast.error("Passwords do not match");
      return;
    }
    if (!token.trim()) {
      toast.error("Missing reset token. Open the link from your email again.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "Could not reset password");
      return;
    }
    toast.success("Password updated. You can log in with your new password.");
    router.push("/login");
    router.refresh();
  }

  if (!token) {
    return (
      <div className="card-glow space-y-3 p-1">
        <p className="text-sm text-zinc-400">This page needs a valid link from the password reset email.</p>
        <Link href="/forgot-password" className="text-sm text-violet-400 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card-glow space-y-4">
      <p className="text-sm text-zinc-400">Choose a new password for your account.</p>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="pw1">
          New password
        </label>
        <input
          id="pw1"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="pw2">
          Confirm new password
        </label>
        <input
          id="pw2"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="input-field"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary disabled:cursor-not-allowed">
        {loading ? "…" : "Update password"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="text-violet-400 hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  return (
    <Suspense
      fallback={<div className="h-48 animate-pulse rounded-xl bg-zinc-800/40" />}
    >
      <Inner />
    </Suspense>
  );
}
