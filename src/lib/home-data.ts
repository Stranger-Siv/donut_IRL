import { connectDB } from "./mongodb";
import { Order } from "@/models/Order.model";
import { Price } from "@/models/Price.model";
import { buildPublicFeedLine } from "./order-public";
import { formatInr } from "./utils";
import { getTierRates } from "./rate-settings";
import { VOLUME_M_DIAMOND, VOLUME_M_GOLD } from "./constants";
import { filterPublicCatalog, inferKind } from "./catalog-scope";

async function getHomePageDataFromDb() {
  await connectDB();
  const [rates, rawPriceRows, feedOrders, totalAgg, times] = await Promise.all([
    getTierRates(),
    Price.find({ active: true }).sort({ sortOrder: 1 }).lean(),
    Order.find({ status: "COMPLETED" })
      .sort({ completedAt: -1 })
      .limit(8)
      .lean(),
    Order.aggregate([
      { $match: { status: "COMPLETED" } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$payoutAmount" },
          totalTrades: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { status: "COMPLETED", completedAt: { $exists: true } } },
      {
        $project: {
          diff: { $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 60000] },
        },
      },
      { $group: { _id: null, avg: { $avg: "$diff" } } },
    ]),
  ]);

  const total = totalAgg[0];
  const avgMin = times[0]?.avg;
  const priceRows = filterPublicCatalog(
    rawPriceRows as Parameters<typeof filterPublicCatalog>[0],
  ) as typeof rawPriceRows;

  return {
    tierRates: {
      STANDARD: rates.standardRate,
      GOLD: rates.goldRate,
      DIAMOND: rates.diamondRate,
    },
    thresholdsM: { goldAt: VOLUME_M_GOLD, diamondAt: VOLUME_M_DIAMOND },
    items: priceRows.map((p) => {
      const slug = String(p.itemSlug ?? "");
      return {
        itemName: p.itemName,
        itemSlug: slug,
        unitLabel: p.unitLabel,
        currentPrice: p.currentPrice,
        kind: inferKind(p as { kind?: string; itemSlug?: string }),
        equivalentMPerUnit: (p as { equivalentMPerUnit?: number }).equivalentMPerUnit ?? 0,
      };
    }),
    feed: feedOrders.map((o) => {
      const line =
        o.publicSummary ||
        buildPublicFeedLine(
          o.itemSlug,
          o.itemName,
          o.quantity,
          o.payoutAmount
        );
      return {
        id: o._id.toString(),
        line,
        at: o.completedAt ?? o.updatedAt,
      };
    }),
    totalPaid: total?.totalPaid ?? 0,
    totalTrades: total?.totalTrades ?? 0,
    avgPayoutTimeMinutes: avgMin ? Math.round(avgMin) : 0,
  };
}

const empty: Awaited<ReturnType<typeof getHomePageDataFromDb>> = {
  tierRates: { STANDARD: 1.8, GOLD: 1.9, DIAMOND: 2.0 },
  thresholdsM: { goldAt: VOLUME_M_GOLD, diamondAt: VOLUME_M_DIAMOND },
  items: [],
  feed: [],
  totalPaid: 0,
  totalTrades: 0,
  avgPayoutTimeMinutes: 0,
};

/** Safe for SSR when MongoDB is down: returns empty stats instead of throwing. */
export async function getHomePageData() {
  try {
    return await getHomePageDataFromDb();
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("ECONNREFUSED") || msg.includes("MONGODB") || /mongo/i.test(msg)) {
        console.warn(
          "[Donut] MongoDB unavailable — homepage uses empty data. Start Mongo or set MONGODB_URI in .env.local (see README).\n"
        );
      } else {
        console.error(e);
      }
    }
    return empty;
  }
}

export function formatTotalPaid(n: number) {
  return formatInr(n);
}
