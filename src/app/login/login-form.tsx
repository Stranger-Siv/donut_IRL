"use client";

import { useState, Suspense, useRef } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardPaste, Lock } from "lucide-react";

function Inner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  async function pasteAuthCode() {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/[^\d]/g, "");
      if (!digits) {
        toast.error("No digits in clipboard — copy the 6-digit code from your authenticator");
        return;
      }
      setCode(digits.slice(0, 8));
      codeInputRef.current?.focus();
    } catch {
      toast.error("Could not read clipboard — paste with the keyboard (Ctrl+V / ⌘V)");
    }
  }

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
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input-field pl-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="totp">
          Authenticator code (6 digits, admins with 2FA)
        </label>
        <div className="flex gap-2">
          <input
            ref={codeInputRef}
            id="totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Only if 2FA is enabled"
            className="input-field min-w-0 flex-1"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ""))}
          />
          <button
            type="button"
            onClick={pasteAuthCode}
            className="focus-brand flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-white/5 min-[380px]:px-3.5"
            title="Paste code from clipboard"
            aria-label="Paste authenticator code from clipboard"
          >
            <ClipboardPaste className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            <span className="hidden min-[420px]:inline">Paste</span>
          </button>
        </div>
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
