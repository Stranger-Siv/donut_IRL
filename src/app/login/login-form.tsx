"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

function Inner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      code: code.replace(/\s/g, ""),
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid credentials — also check 6-digit code if 2FA is on for that account");
      return;
    }
    if (res?.ok) {
      router.push(res.url || callbackUrl);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-glow space-y-4">
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
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="totp">
          Authenticator code (6 digits, admins with 2FA)
        </label>
        <input
          id="totp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Only if 2FA is enabled"
          className="input-field"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ""))}
        />
      </div>
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-violet-400 hover:underline">
          Forgot password?
        </Link>
      </div>
      <button type="submit" disabled={loading} className="btn-primary disabled:cursor-not-allowed">
        {loading ? "…" : "Log in"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        No account?{" "}
        <Link href="/register" className="text-violet-400 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-zinc-800/40" />}>
      <Inner />
    </Suspense>
  );
}
