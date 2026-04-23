"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

function Inner({
  initialRefCode,
  initialReferrerName,
}: {
  initialRefCode?: string;
  initialReferrerName: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState(
    () => searchParams?.get("ref") || ""
  );
  const [loading, setLoading] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(
    () => initialReferrerName
  );

  const refParam = (searchParams?.get("ref") || "").trim().toUpperCase();
  const initialCodeNorm = (initialRefCode || "").toUpperCase();

  useEffect(() => {
    if (!refParam) {
      setReferrerName(null);
      return;
    }
    if (refParam === initialCodeNorm && initialReferrerName != null) {
      setReferrerName(initialReferrerName);
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/referrals/resolve?code=${encodeURIComponent(refParam)}`
    )
      .then((r) => r.json() as Promise<{ referrerName: string | null }>)
      .then((d) => {
        if (!cancelled) setReferrerName(d.referrerName);
      });
    return () => {
      cancelled = true;
    };
  }, [refParam, initialCodeNorm, initialReferrerName]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        referralCode: referral || undefined,
      }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "Could not create account");
      return;
    }
    toast.success("Account created. Signing you in…");
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    if (sign?.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      router.push("/login");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-glow space-y-4 sm:space-y-5">
      {refParam && referrerName && (
        <p
          className="rounded-lg border border-violet-500/30 bg-violet-950/50 px-3 py-2 text-sm text-violet-100"
          role="status"
        >
          You are referred by{" "}
          <span className="font-semibold text-zinc-50">{referrerName}</span>
        </p>
      )}
      {refParam && !referrerName && (
        <p
          className="rounded-lg border border-amber-500/20 bg-amber-950/30 px-3 py-2 text-sm text-amber-200/90"
          role="status"
        >
          This referral code could not be found. You can still create an
          account.
        </p>
      )}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="name">
          Display name
        </label>
        <input
          id="name"
          type="text"
          required
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="reg-email">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          required
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="reg-pw">
          Password
        </label>
        <input
          id="reg-pw"
          type="password"
          required
          minLength={8}
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500" htmlFor="ref">
          Referral code (optional)
        </label>
        <input
          id="ref"
          type="text"
          className="input-field font-mono text-sm sm:text-sm uppercase"
          value={referral}
          onChange={(e) => setReferral(e.target.value.toUpperCase())}
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary disabled:cursor-not-allowed">
        {loading ? "…" : "Create account"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({
  initialRefCode,
  initialReferrerName = null,
}: {
  initialRefCode?: string;
  initialReferrerName?: string | null;
} = {}) {
  return (
    <Suspense
      fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-800/40" />}
    >
      <Inner
        initialRefCode={initialRefCode}
        initialReferrerName={initialReferrerName ?? null}
      />
    </Suspense>
  );
}
