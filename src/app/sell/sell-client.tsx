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
import { Wallet, Shield, ChevronRight, UserPlus } from "lucide-react";
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
    } else if (sessionStatus === "authenticated" && session) {
      const m = await fetch("/api/user/me", {
        cache: "no-store",
        credentials: "include",
      }).catch(() => null);
      if (m?.ok) {
        const u = (await m.json()) as { sellerTier?: string };
        if (u.sellerTier) {
          setUserSellerTier(u.sellerTier as "STANDARD" | "GOLD" | "DIAMOND");
        } else {
          setUserSellerTier(null);
        }
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

    if (!session || session.user.role !== "USER") {
      if (!email.trim() || !password || password !== confirmPassword) {
        toast.error("Enter a valid email and matching passwords (min 8 chars).");
        return;
      }
      const suggestedName = (email.trim().split("@")[0] || "Seller").trim();
      const regBody: Record<string, unknown> = {
        name: suggestedName.length >= 2 ? suggestedName : "Seller User",
        email: email.trim().toLowerCase(),
        password,
      };
      if (referral.trim()) regBody.referralCode = referral.trim().toUpperCase();
      setLoading(true);
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regBody),
      });
      const regJson = (await regRes.json().catch(() => ({}))) as { error?: string; email?: string };
      setLoading(false);
      if (!regRes.ok) {
        toast.error(regJson.error || "Could not create account");
        return;
      }
      const sign = await signIn("credentials", {
        email: regJson.email || email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: "/sell",
      });
      if (!sign?.ok) {
        toast.success("Account created. Please log in to continue.");
        router.push("/login?callbackUrl=/sell");
        return;
      }
      toast.success("Account created. Review details and tap Submit order.");
      setStep(2);
      router.refresh();
      return;
    }

    const orderBody: Record<string, unknown> = {
      itemSlug,
      quantity,
      payoutMethod,
      payoutDetails,
    };

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

    if (!res.ok) {
      toast.error(j.error || "Order failed");
      return;
    }

    const orderId = j._id as string;
    toast.success("Order placed.");
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
              This step creates your account only. Your order is submitted only after you log in and tap
              Submit order.
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
            {loading ? "…" : "Create account"}
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
