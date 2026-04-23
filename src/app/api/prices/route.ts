import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Price } from "@/models/Price.model";
import { getTierRates } from "@/lib/rate-settings";
import { VOLUME_M_DIAMOND, VOLUME_M_GOLD } from "@/lib/constants";
import { isMongoConnectionError } from "@/lib/db-errors";
import { getSellMinimums } from "@/lib/sell-minimums";
import { filterPublicCatalog, inferKind } from "@/lib/catalog-scope";
import { AppSettings } from "@/models/AppSettings.model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const [rates, rawItems, mins, st] = await Promise.all([
      getTierRates(),
      Price.find({ active: true }).sort({ sortOrder: 1 }).lean(),
      getSellMinimums(),
      AppSettings.findById("global").lean(),
    ]);
    const items = filterPublicCatalog(
      rawItems as Parameters<typeof filterPublicCatalog>[0]
    ) as typeof rawItems;
    return NextResponse.json({
      minSellQuantityM: mins.minSellQuantityM,
      minSellItemUnits: mins.minSellItemUnits,
      displayFx: {
        inrPerUsd: st?.displayFxUsdInr ?? 83,
        inrPerEur: st?.displayFxEurInr ?? 90,
        disclaimer: "Indicative only; settlement is in INR.",
      },
      tierRates: {
        STANDARD: rates.standardRate,
        GOLD: rates.goldRate,
        DIAMOND: rates.diamondRate,
      },
      thresholdsM: {
        goldAt: VOLUME_M_GOLD,
        diamondAt: VOLUME_M_DIAMOND,
      },
      items: items.map((p) => {
        const kind = inferKind(p as { kind?: string; itemSlug?: string });
        const isCurrency = kind === "CURRENCY";
        /** Per-1M money uses global tier rates; the catalog number is the Diamond ₹/1M. */
        return {
          _id: p._id.toString(),
          itemName: p.itemName,
          itemSlug: p.itemSlug,
          unitLabel: p.unitLabel,
          currentPrice: isCurrency ? rates.diamondRate : p.currentPrice,
          kind,
          equivalentMPerUnit: (p as { equivalentMPerUnit?: number }).equivalentMPerUnit ?? 0,
          sortOrder: p.sortOrder,
        };
      }),
    });
  } catch (e) {
    if (isMongoConnectionError(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Donut] /api/prices: MongoDB not reachable — returning offline payload."
        );
      }
      return NextResponse.json(
        {
          minSellQuantityM: 1,
          minSellItemUnits: 1,
          displayFx: { inrPerUsd: 83, inrPerEur: 90, disclaimer: "Indicative only; settlement is in INR." },
          tierRates: { STANDARD: 1.8, GOLD: 1.9, DIAMOND: 2.0 },
          thresholdsM: { goldAt: VOLUME_M_GOLD, diamondAt: VOLUME_M_DIAMOND },
          items: [],
        },
        { status: 200, headers: { "X-Data-Source": "offline" } }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
