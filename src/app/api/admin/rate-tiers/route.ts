import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { RateSettings } from "@/models/RateSettings.model";
import { Price } from "@/models/Price.model";
import { sendDiscordEvent } from "@/lib/discord";
import { CANONICAL_MONEY_SLUG } from "@/lib/catalog-scope";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

const patchSchema = z.object({
  standardRate: z.number().min(0).max(1000).optional(),
  goldRate: z.number().min(0).max(1000).optional(),
  diamondRate: z.number().min(0).max(1000).optional(),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  let doc = await RateSettings.findById("global");
  if (!doc) {
    doc = await RateSettings.create({
      _id: "global",
      standardRate: 1.8,
      goldRate: 1.9,
      diamondRate: 2.0,
    });
  }
  return NextResponse.json({
    standardRate: doc.standardRate,
    goldRate: doc.goldRate,
    diamondRate: doc.diamondRate,
  });
}

export async function PATCH(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const json = await req.json();
  const p = patchSchema.safeParse(json);
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  let doc = await RateSettings.findById("global");
  if (!doc) {
    doc = await RateSettings.create({
      _id: "global",
      standardRate: p.data.standardRate ?? 1.8,
      goldRate: p.data.goldRate ?? 1.9,
      diamondRate: p.data.diamondRate ?? 2.0,
    });
  } else {
    if (p.data.standardRate != null) doc.standardRate = p.data.standardRate;
    if (p.data.goldRate != null) doc.goldRate = p.data.goldRate;
    if (p.data.diamondRate != null) doc.diamondRate = p.data.diamondRate;
    await doc.save();
  }
  const d = doc;
  await Price.updateMany(
    {
      $or: [
        { kind: "CURRENCY" },
        { itemSlug: { $in: [CANONICAL_MONEY_SLUG, "1-m"] } },
      ],
    },
    { $set: { currentPrice: d.diamondRate } }
  );
  void sendDiscordEvent({
    type: "rate",
    body: `Tier M rates: Standard ₹${d.standardRate} · Gold ₹${d.goldRate} · Diamond ₹${d.diamondRate}`,
  });
  return NextResponse.json({
    standardRate: d.standardRate,
    goldRate: d.goldRate,
    diamondRate: d.diamondRate,
  });
}
