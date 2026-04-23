import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { HeroSection } from "@/components/home/hero-section";
import { HeroSignedIn } from "@/components/home/hero-signed-in";
import { LiveRatesBoard } from "@/components/home/live-rates-board";
import { RecentTradesFeed } from "@/components/home/recent-trades-feed";
import { PublicStatsRow } from "@/components/home/public-stats";
import { getHomePageData } from "@/lib/home-data";
import Link from "next/link";
import { VOLUME_M_GOLD, VOLUME_M_DIAMOND } from "@/lib/constants";

export const revalidate = 30;

function displayNameFromSession(name: string | null | undefined, email: string | null | undefined) {
  const n = name?.trim();
  if (n) return n;
  const e = email?.trim();
  if (e) return e.split("@")[0] ?? "there";
  return "there";
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const signedIn = !!session?.user;
  const welcomeName = session?.user
    ? displayNameFromSession(session.user.name, session.user.email)
    : "";

  const data = await getHomePageData().catch(() => ({
    tierRates: { STANDARD: 1.8, GOLD: 1.9, DIAMOND: 2.0 } as const,
    thresholdsM: { goldAt: VOLUME_M_GOLD, diamondAt: VOLUME_M_DIAMOND },
    items: [] as {
      itemName: string;
      itemSlug: string;
      unitLabel: string;
      currentPrice: number;
      kind: string;
    }[],
    feed: [] as { id: string; line: string; at?: Date }[],
    totalPaid: 0,
    totalTrades: 0,
    avgPayoutTimeMinutes: 0,
  }));

  const { tierRates, items, feed, totalPaid, totalTrades, avgPayoutTimeMinutes } = data;

  return (
    <div className="space-y-12 sm:space-y-16">
      {signedIn ? <HeroSignedIn displayName={welcomeName} /> : <HeroSection />}

      <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-zinc-500">
        <span className="text-zinc-400">Tier</span> = lifetime volume: Gold from {data.thresholdsM.goldAt}M, Diamond
        from {data.thresholdsM.diamondAt}M. Volume is counted in 1M (millions) of in-game money.
      </p>

      <div className="grid gap-10 lg:grid-cols-2">
        <LiveRatesBoard tierRates={tierRates} items={items} />
        <RecentTradesFeed
          items={feed.map((f) => ({
            id: f.id,
            line: f.line,
            at: f.at,
          }))}
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-300 sm:text-base">Trust at a glance</h2>
        <PublicStatsRow
          totalPaid={totalPaid}
          totalTrades={totalTrades}
          avgPayoutTimeMinutes={avgPayoutTimeMinutes}
        />
      </section>

      <div className="card-glow flex flex-col items-center justify-center gap-3 border border-violet-500/20 py-8 text-center sm:py-10">
        {signedIn ? (
          <>
            <p className="text-lg font-medium text-zinc-100">Ready to sell?</p>
            <p className="max-w-md text-sm text-zinc-500">
              You’re logged in — go straight to the sell flow or review past orders on your dashboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/sell"
                className="focus-brand rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-violet-500"
              >
                Sell now
              </Link>
              <Link
                href="/dashboard"
                className="focus-brand rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
              >
                My orders
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-medium text-zinc-100">Have in-game money to sell?</p>
            <p className="max-w-md text-sm text-zinc-500">
              Start the sell flow — we only require an account at guest checkout.
            </p>
            <Link
              href="/sell"
              className="focus-brand rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-violet-500"
            >
              Sell now
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
