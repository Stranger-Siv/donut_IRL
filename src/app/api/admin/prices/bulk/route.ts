import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Price } from "@/models/Price.model";
import { PriceHistory } from "@/models/PriceHistory.model";
import { RateSettings } from "@/models/RateSettings.model";
import { syncTierRatesToMoneyDiamond } from "@/lib/rate-settings";
import { logAdminAction, getRequestIp } from "@/lib/admin-audit";
import { sendDiscordEvent } from "@/lib/discord";
import { CANONICAL_MONEY_SLUG } from "@/lib/catalog-scope";

export const dynamic = "force-dynamic";

const body = z.object({
  percent: z.number().min(-50).max(100),
});

export async function POST(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const p = body.safeParse(await req.json());
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const mult = 1 + p.data.percent / 100;
  await connectDB();

  const all = await Price.find({
    itemSlug: { $in: [CANONICAL_MONEY_SLUG, "1-m"] },
  });

  let updated = 0;
  for (const doc of all) {
    const old = doc.currentPrice;
    const next = Math.max(0, Math.round(doc.currentPrice * mult * 100) / 100);
    if (next === old) continue;
    doc.currentPrice = next;
    await doc.save();
    updated += 1;
    await PriceHistory.create({
      itemName: doc.itemName,
      itemSlug: doc.itemSlug,
      price: next,
    });
    let rs = await RateSettings.findById("global");
    if (!rs) {
      const created = {
        _id: "global" as const,
        standardRate: 1.8,
        goldRate: 1.9,
        diamondRate: 2.0,
      };
      syncTierRatesToMoneyDiamond(created, next);
      rs = await RateSettings.create(created);
    } else {
      syncTierRatesToMoneyDiamond(rs, next);
      await rs.save();
    }
    await Price.updateMany(
      {
        $or: [
          { kind: "CURRENCY" },
          { itemSlug: { $in: [CANONICAL_MONEY_SLUG, "1-m"] } },
        ],
      },
      { $set: { currentPrice: next } }
    );
  }
  void sendDiscordEvent({
    type: "rate",
    body: `Bulk price update: ${p.data.percent > 0 ? "+" : ""}${p.data.percent}% on 1M money`,
  });
  await logAdminAction(s.id, "prices.bulk", {
    meta: { percent: p.data.percent },
    ip: getRequestIp(req.headers),
  });
  return NextResponse.json({ ok: true, updated });
}
