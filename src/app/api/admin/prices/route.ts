import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Price } from "@/models/Price.model";
import { PriceHistory } from "@/models/PriceHistory.model";
import { RateSettings } from "@/models/RateSettings.model";
import { notifyPriceAlerts } from "@/lib/price-alert-check";
import { sendDiscordEvent } from "@/lib/discord";
import {
  CANONICAL_MONEY_SLUG,
  filterPublicCatalog,
  isPublicCatalogItem,
} from "@/lib/catalog-scope";
import { syncTierRatesToMoneyDiamond } from "@/lib/rate-settings";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  line: z.literal("MONEY_1M"),
  itemName: z.string().min(1).max(120),
  currentPrice: z.number().min(0),
  unitLabel: z.string().max(40).optional(),
  sortOrder: z.number().optional(),
});

const patchSchema = z.object({
  _id: z.string().optional(),
  itemName: z.string().optional(),
  currentPrice: z.number().min(0).optional(),
  sellPrice: z.number().min(0).nullable().optional(),
  unitLabel: z.string().optional(),
  kind: z.enum(["CURRENCY", "ITEM"]).optional(),
  equivalentMPerUnit: z.number().min(0).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function GET() {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const all = await Price.find().sort({ sortOrder: 1 }).lean();
  return NextResponse.json(
    filterPublicCatalog(all as Parameters<typeof filterPublicCatalog>[0])
  );
}

export async function POST(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const json = await req.json();
  const p = postSchema.safeParse(json);
  if (!p.success) {
    return NextResponse.json(
      { error: "Invalid input — use line MONEY_1M with itemName, currentPrice." },
      { status: 400 }
    );
  }
  await connectDB();
  const taken = await Price.findOne({ itemSlug: { $in: [CANONICAL_MONEY_SLUG, "1-m"] } });
  if (taken) {
    return NextResponse.json(
      { error: "The 1M money line already exists. Edit the row in the table." },
      { status: 409 }
    );
  }

  const itemSlug = CANONICAL_MONEY_SLUG;
  const kind = "CURRENCY" as const;
  const pr = await Price.create({
    itemName: p.data.itemName,
    itemSlug,
    unitLabel: p.data.unitLabel,
    currentPrice: p.data.currentPrice,
    kind,
    equivalentMPerUnit: 1,
    sortOrder: p.data.sortOrder,
  });
  if (Number.isFinite(p.data.currentPrice)) {
    const rs = await RateSettings.findById("global");
    if (!rs) {
      const doc = {
        _id: "global" as const,
        standardRate: 1.8,
        goldRate: 1.9,
        diamondRate: 2.0,
      };
      syncTierRatesToMoneyDiamond(doc, p.data.currentPrice);
      await RateSettings.create(doc);
    } else {
      syncTierRatesToMoneyDiamond(rs, p.data.currentPrice);
      await rs.save();
    }
    await Price.updateMany(
      {
        $or: [
          { kind: "CURRENCY" },
          { itemSlug: { $in: [CANONICAL_MONEY_SLUG, "1-m"] } },
        ],
      },
      { $set: { currentPrice: p.data.currentPrice } }
    );
  }
  await PriceHistory.create({
    itemName: pr.itemName,
    itemSlug,
    price: pr.currentPrice,
  });
  return NextResponse.json({
    _id: pr._id.toString(),
    itemSlug,
  });
}

export async function PATCH(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const json = await req.json();
  const p = patchSchema.safeParse(json);
  if (!p.success || !p.data._id) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const doc = await Price.findById(p.data._id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    !isPublicCatalogItem({
      kind: String(doc.kind || ""),
      itemSlug: String(doc.itemSlug || ""),
    })
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const old = doc.currentPrice;
  if (p.data.itemName) doc.itemName = p.data.itemName;
  if (p.data.kind && p.data.kind !== doc.kind) {
    return NextResponse.json(
      { error: "Product type cannot be changed" },
      { status: 400 }
    );
  }
  if (p.data.currentPrice != null) doc.currentPrice = p.data.currentPrice;
  if (p.data.sellPrice !== undefined) {
    if (p.data.sellPrice === null) {
      doc.set("sellPrice", undefined);
    } else {
      doc.set("sellPrice", p.data.sellPrice);
    }
  }
  if (p.data.unitLabel) doc.unitLabel = p.data.unitLabel;
  if (p.data.equivalentMPerUnit != null) doc.set("equivalentMPerUnit", p.data.equivalentMPerUnit);
  if (p.data.active != null) doc.active = p.data.active;
  if (p.data.sortOrder != null) doc.sortOrder = p.data.sortOrder;
  await doc.save();

  const isCurrency = doc.kind === "CURRENCY" || String(doc.itemSlug) === CANONICAL_MONEY_SLUG;
  if (p.data.currentPrice != null && isCurrency) {
    let rs = await RateSettings.findById("global");
    if (!rs) {
      const docRs = {
        _id: "global" as const,
        standardRate: 1.8,
        goldRate: 1.9,
        diamondRate: 2.0,
      };
      syncTierRatesToMoneyDiamond(docRs, doc.currentPrice);
      rs = await RateSettings.create(docRs);
    } else {
      syncTierRatesToMoneyDiamond(rs, doc.currentPrice);
      await rs.save();
    }
    await Price.updateMany(
      {
        $or: [
          { kind: "CURRENCY" },
          { itemSlug: { $in: [CANONICAL_MONEY_SLUG, "1-m"] } },
        ],
      },
      { $set: { currentPrice: doc.currentPrice } }
    );
  }

  if (p.data.currentPrice != null && p.data.currentPrice !== old) {
    await PriceHistory.create({
      itemName: doc.itemName,
      itemSlug: doc.itemSlug,
      price: doc.currentPrice,
    });
    void notifyPriceAlerts(doc.itemSlug, doc.currentPrice);
    void sendDiscordEvent({
      type: "rate",
      body: `${doc.itemName}: now ₹${doc.currentPrice} (was ₹${old})`,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await connectDB();
  const doc = await Price.findById(id);
  if (doc) {
    if (
      !isPublicCatalogItem({
        kind: String(doc.kind || ""),
        itemSlug: String(doc.itemSlug || ""),
      })
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    doc.active = false;
    await doc.save();
  }
  return NextResponse.json({ ok: true });
}
