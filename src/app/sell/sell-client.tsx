"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useSellStore,
  estimatePayout,
  minQuantityForSelection,
  type ItemRow,
} from "@/store/sell-calc";
import { SellItemCatalog } from "@/components/sell/sell-item-catalog";
import { Wallet, Shield, ChevronRight, UserPlus, UserCircle } from "lucide-react";
import { cn, formatInrDecimal } from "@/lib/utils";
import { SellPageSkeleton } from "@/components/ui/skeleton";
import { inrToApproxEur, inrToApproxUsd } from "@/lib/currency-fx";

type Step = 1 | 2 | 3;

export function SellClient() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    tierRates,
    items,
    setCatalog,
    itemSlug,
    quantity,
    userSellerTier,
    setUserSellerTier,
    minSellQuantityM,
    minSellItemUnits,
  } = useSellStore();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [loading, setLoading] = useState(false);
  /** RuneScape in-game name (same field as Referrals / PATCH /api/user/me). */
  const [inGameName, setInGameName] = useState("");
  const [ignDraft, setIgnDraft] = useState("");
  const [ignEditing, setIgnEditing] = useState(false);
  const [savingIgn, setSavingIgn] = useState(false);
  const [displayFx, setDisplayFx] = useState<{ inrPerUsd: number; inrPerEur: number } | null>(null);
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    const r = searchParams?.get("ref")?.trim();
    if (r) {
      setReferral((prev) => (prev ? prev : r.toUpperCase()));
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    try {
    const pRes = await fetch("/api/prices");
    if (!pRes.ok) return;
    const data = (await pRes.json()) as {
      tierRates: Record<"STANDARD" | "GOLD" | "DIAMOND", number>;
      minSellQuantityM?: number;
      minSellItemUnits?: number;
      displayFx?: { inrPerUsd: number; inrPerEur: number; disclaimer?: string };
      items: {
        itemName: string;
        itemSlug: string;
        unitLabel: string;
        currentPrice: number;
        kind: string;
        equivalentMPerUnit: number;
      }[];
    };
    if (data.displayFx) {
      setDisplayFx({ inrPerUsd: data.displayFx.inrPerUsd, inrPerEur: data.displayFx.inrPerEur });
    }
    const rows: ItemRow[] = data.items.map((i) => ({
      itemName: i.itemName,
      itemSlug: i.itemSlug,
      currentPrice: i.currentPrice,
      unitLabel: i.unitLabel,
      kind: i.kind === "CURRENCY" ? "CURRENCY" : "ITEM",
      equivalentMPerUnit: i.equivalentMPerUnit ?? 0,
    }));
    setCatalog(data.tierRates, rows, {
      minSellQuantityM: data.minSellQuantityM ?? 1,
      minSellItemUnits: data.minSellItemUnits ?? 1,
    });
    /* Tier + rate: always prefer /api/user/me (DB + volume) — JWT can stay stale (e.g. still STANDARD). */
    if (sessionStatus === "unauthenticated") {
      setUserSellerTier(null);
      setInGameName("");
    } else if (sessionStatus === "authenticated" && session) {
      const m = await fetch("/api/user/me", {
        cache: "no-store",
        credentials: "include",
      }).catch(() => null);
      if (m?.ok) {
        const u = (await m.json()) as { sellerTier?: string; inGameName?: string };
        if (u.sellerTier) {
          setUserSellerTier(u.sellerTier as "STANDARD" | "GOLD" | "DIAMOND");
        } else {
          setUserSellerTier(null);
        }
        setInGameName((u.inGameName || "").trim());
      } else if (session.user?.sellerTier) {
        setUserSellerTier(session.user.sellerTier);
      } else {
        setUserSellerTier(null);
      }
    }
    } finally {
      setStoreReady(true);
    }
  }, [session, sessionStatus, setCatalog, setUserSellerTier]);

  useEffect(() => {
    void load();
  }, [load, sessionStatus]);

  useEffect(() => {
    if (!ignEditing) {
      setIgnDraft(inGameName);
    }
  }, [inGameName, ignEditing]);

  const savedIgn = inGameName;
  const hasSavedIgn = Boolean(savedIgn.trim());
  const showIgnInput = !hasSavedIgn || ignEditing;

  async function saveIgn() {
    setSavingIgn(true);
    try {
      const r = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inGameName: ignDraft.trim() }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Could not save");
      }
      const saved = (await r.json().catch(() => ({}))) as { inGameName?: string };
      if (typeof saved.inGameName === "string") {
        setInGameName(saved.inGameName);
        setIgnDraft(saved.inGameName);
      }
      toast.success("In-game name saved");
      setIgnEditing(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingIgn(false);
    }
  }

  const estimate = useMemo(
    () =>
      estimatePayout({
        itemSlug,
        quantity,
        items,
        tierRates,
        userSellerTier,
      }),
    [itemSlug, quantity, items, tierRates, userSellerTier]
  );

  const line = useMemo(
    () => items.find((i) => i.itemSlug === itemSlug) ?? null,
    [items, itemSlug]
  );
  const minQ = useMemo(
    () =>
      minQuantityForSelection(line, {
        minSellQuantityM,
        minSellItemUnits,
      }),
    [line, minSellQuantityM, minSellItemUnits]
  );

  const step1Valid = useMemo(
    () =>
      Boolean(
        itemSlug &&
          line &&
          Number.isFinite(quantity) &&
          quantity > 0 &&
          quantity >= minQ
      ),
    [itemSlug, line, quantity, minQ]
  );

  function goNext() {
    if (step === 1) {
      if (!itemSlug || quantity <= 0) {
        toast.error("Select an item and quantity.");
        return;
      }
      if (quantity < minQ) {
        toast.error(
          line?.kind === "CURRENCY"
            ? `Minimum order is ${minQ}× 1M in-game money (set in Admin → Settings).`
            : `Minimum order is ${minQ} unit(s) (set in Admin → Settings).`
        );
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
    }
  }

  async function submitAll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payoutMethod = (fd.get("payoutMethod") as string) || "UPI";
    const payoutDetails = (fd.get("payoutDetails") as string) || "";
    if (!itemSlug || quantity <= 0) {
      toast.error("Invalid order.");
      return;
    }
    if (quantity < minQ) {
      toast.error(
        line?.kind === "CURRENCY"
          ? `Minimum order is ${minQ}× 1M.`
          : `Minimum order is ${minQ} unit(s).`
      );
      return;
    }
    if (!payoutDetails.trim()) {
      toast.error("Add payout details.");
      return;
    }

    const orderBody: Record<string, unknown> = {
      itemSlug,
      quantity,
      payoutMethod,
      payoutDetails,
    };

    if (!session || session.user.role !== "USER") {
      if (!email.trim() || !password || password !== confirmPassword) {
        toast.error("Enter a valid email and matching passwords (min 8 chars).");
        return;
      }
      orderBody.email = email.trim().toLowerCase();
      orderBody.password = password;
      orderBody.confirmPassword = confirmPassword;
      if (referral.trim()) orderBody.referralCode = referral.trim().toUpperCase();
    }

    setLoading(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderBody),
    });
    const j = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      _id?: string;
      createdAccount?: boolean;
      email?: string;
    };
    setLoading(false);

    if (res.status === 409 && j.code === "EXISTING_EMAIL") {
      toast.error(j.error || "Account exists");
      router.push("/login?callbackUrl=/sell");
      return;
    }
    if (!res.ok) {
      toast.error(j.error || "Order failed");
      return;
    }

    const orderId = j._id as string;
    if (j.createdAccount && j.email) {
      const sign = await signIn("credentials", {
        email: j.email,
        password: password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (sign?.ok) {
        toast.success("Account created and order placed.");
        router.push(`/orders/${orderId}`);
        router.refresh();
        return;
      }
      toast.success("Order placed. Log in to track.");
    } else {
      toast.success("Order placed.");
    }
    router.push(`/orders/${orderId}`);
    router.refresh();
  }

  const needsAccount = !session || session.user.role !== "USER";
  const showAccountFields = needsAccount && step === 3;

  if (sessionStatus === "loading" || !storeReady) {
    return <SellPageSkeleton />;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-balance text-xl font-semibold text-zinc-50 sm:text-2xl">Sell</h1>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          1M in-game money only. Pick a line, quantity, and payout — we only ask for an account at
          checkout (guest) or you can use your existing seller account.
        </p>
      </div>

      {sessionStatus === "authenticated" && (
        <div className="card-glow space-y-3 text-sm text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-200">
            <UserCircle className="h-4 w-4 text-cyan-300/90" />
            <span className="font-medium">In-game name (RuneScape)</span>
          </div>
          <p className="text-xs text-zinc-500">
            Used for ops and referral deliveries. Same value as on the{" "}
            <Link href="/referrals" className="text-violet-400 hover:underline">
              Referrals
            </Link>{" "}
            page.
          </p>
          {!showIgnInput && hasSavedIgn && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-200/80">
                Current in-game name
              </p>
              <p className="mt-0.5 font-mono text-base font-semibold text-zinc-100">{savedIgn}</p>
              <button
                type="button"
                onClick={() => {
                  setIgnEditing(true);
                  setIgnDraft(inGameName);
                }}
                className="mt-2 text-sm font-medium text-violet-300 hover:text-violet-200 hover:underline"
              >
                Change in-game name
              </button>
            </div>
          )}
          {showIgnInput && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500" htmlFor="sell-ign">
                {hasSavedIgn ? "New in-game name" : "In-game name"}
              </label>
              <input
                id="sell-ign"
                type="text"
                autoComplete="nickname"
                maxLength={80}
                value={ignDraft}
                onChange={(e) => setIgnDraft(e.target.value)}
                placeholder="e.g. MyMain"
                className="input-field"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveIgn()}
                  disabled={savingIgn}
                  className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
                >
                  {savingIgn ? "Saving…" : hasSavedIgn ? "Save new name" : "Save in-game name"}
                </button>
                {hasSavedIgn && ignEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIgnEditing(false);
                      setIgnDraft(inGameName);
                    }}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ol className="flex flex-wrap gap-1.5 text-[11px] text-zinc-500 sm:gap-2 sm:text-xs" aria-label="Steps">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={cn(
              "inline-flex min-h-8 min-w-0 items-center rounded-md border border-transparent px-2.5 py-1.5 sm:min-h-0",
              step === n && "border-violet-500/40 bg-violet-500/20 text-violet-100",
              step > n && "text-emerald-500/80"
            )}
          >
            {n === 1 && "1. Choose & amount"}
            {n === 2 && "2. Payout"}
            {n === 3 && "3. Confirm"}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="card-glow space-y-4">
          <SellItemCatalog />
          <button
            type="button"
            onClick={goNext}
            disabled={!step1Valid}
            className={cn(
              "focus-brand flex min-h-11 w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold",
              step1Valid
                ? "bg-violet-600 text-white hover:bg-violet-500"
                : "cursor-not-allowed border border-red-500/40 bg-red-950/50 text-red-200/90"
            )}
            aria-disabled={!step1Valid}
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={submitAll} className="space-y-6">
        {step >= 2 && (
          <div className="card-glow space-y-3">
            <div className="rounded-lg border border-white/5 bg-zinc-950/50 p-3 text-sm">
              <p className="text-xs text-zinc-500">Your order</p>
              <p className="mt-0.5 font-medium text-zinc-200">
                {line?.itemName ?? "—"} <span className="text-zinc-500">×</span>{" "}
                <span className="font-mono text-violet-200">{quantity}</span>
              </p>
              <p className="mt-1 font-mono text-lg text-violet-200">{formatInrDecimal(estimate)}</p>
              {displayFx && estimate > 0 && (
                <p className="mt-1 text-[11px] text-zinc-500">
                  ≈ ${inrToApproxUsd(estimate, displayFx.inrPerUsd).toFixed(2)} USD · ≈
                  {inrToApproxEur(estimate, displayFx.inrPerEur).toFixed(2)} EUR — indicative only, you are paid in
                  INR.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Wallet className="h-4 w-4 text-cyan-400" />
              Payout
            </div>
            <div className="flex flex-wrap gap-2">
              {(["UPI", "BANK", "CRYPTO"] as const).map((m) => (
                <label
                  key={m}
                  className="cursor-pointer rounded-md border border-white/10 px-3 py-1.5 text-sm has-[:checked]:border-violet-500/50 has-[:checked]:bg-violet-500/10"
                >
                  <input
                    type="radio"
                    name="payoutMethod"
                    value={m}
                    defaultChecked={m === "UPI"}
                    className="sr-only"
                  />
                  {m}
                </label>
              ))}
            </div>
            <textarea
              name="payoutDetails"
              required
              rows={3}
              className="focus-brand w-full min-w-0 rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-base sm:text-sm"
              placeholder="UPI / account + IFSC / wallet"
            />
            {step === 2 && needsAccount && (
              <button
                type="button"
                onClick={goNext}
                className="focus-brand min-h-11 w-full rounded-lg bg-violet-600/80 py-2.5 text-sm font-semibold text-white"
              >
                Continue to account
              </button>
            )}
          </div>
        )}

        {showAccountFields && (
          <div className="card-glow space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <UserPlus className="h-4 w-4 text-amber-400" />
              Create your seller account
            </div>
            <input
              type="email"
              required
              autoComplete="email"
              className="input-field"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input-field"
              placeholder="Password (min 8)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              required
              minLength={8}
              className="input-field"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <input
              type="text"
              className="input-field font-mono text-sm uppercase sm:text-sm"
              placeholder="Referral code (optional)"
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-zinc-500">
              By submitting you create an account and accept the order. Discord can be linked later in
              settings.
            </p>
          </div>
        )}

        {step === 2 && !needsAccount && (
          <button
            type="submit"
            disabled={loading}
            className="focus-brand min-h-11 w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "…" : "Submit order"}
          </button>
        )}

        {step === 3 && needsAccount && (
          <button
            type="submit"
            disabled={loading}
            className="focus-brand min-h-11 w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "…" : "Create account & submit order"}
          </button>
        )}

        {step === 2 && needsAccount && (
          <p className="text-center text-xs text-zinc-500">
            <Link href="/login" className="text-violet-400 underline">
              Already have an account? Log in
            </Link>
          </p>
        )}
      </form>

      {step > 1 && (
        <button
          type="button"
          className="text-sm text-zinc-500 hover:text-zinc-300"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
        >
          ← Back
        </button>
      )}

      {needsAccount && step < 2 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-100/90">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" />
          <span>You can explore rates without signing in. We only ask for an account on the last step.</span>
        </div>
      )}
    </div>
  );
}
