import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import { getTierRates, rateForTier } from "@/lib/rate-settings";
import {
  higherSellerTier,
  nextTierProgress,
  normalizeSellerTier,
  sellerTierFromVolumeM,
} from "@/lib/tier";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const u = await User.findById(s.id)
    .select(
      "name email role sellerTier lifetimeVolumeSold totalSoldInr referralCode firstSellCompleted priceAlerts riskFlags discordLinked discordUserId inGameName"
    )
    .lean();
  if (!u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rates = await getTierRates();
  const vol = u.lifetimeVolumeSold || 0;
  const fromVolume = sellerTierFromVolumeM(vol);
  const stored = normalizeSellerTier(
    (u as { sellerTier?: string }).sellerTier as string | undefined
  );
  /** Use the higher of stored tier and volume-based tier so rates match lifetime volume. */
  const st = higherSellerTier(stored, fromVolume) as "STANDARD" | "GOLD" | "DIAMOND";
  if (st !== stored) {
    await User.findByIdAndUpdate(s.id, { $set: { sellerTier: st } });
  }
  const currentRate = rateForTier(rates, st);
  const prog = nextTierProgress(vol);
  return NextResponse.json({
    id: s.id,
    name: u.name,
    email: u.email,
    role: u.role,
    sellerTier: st,
    currentRatePerM: currentRate,
    lifetimeVolumeSold: vol,
    nextTier: prog.next,
    needMToNext: prog.needM,
    totalSoldInr: u.totalSoldInr,
    referralCode: u.referralCode,
    inGameName: (u as { inGameName?: string }).inGameName?.trim() ?? "",
    firstSellCompleted: u.firstSellCompleted,
    priceAlerts: u.priceAlerts || [],
    riskFlags: u.riskFlags || [],
    discordLinked: u.discordLinked ?? false,
  });
}

const patchMeSchema = z.object({
  inGameName: z.preprocess(
    (val) => (val === null || val === undefined ? "" : String(val)),
    z.string().max(80)
  ),
});

export async function PATCH(req: Request) {
  const s = await getSessionUser();
  if (!s?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await req.json().catch(() => ({}));
  const p = patchMeSchema.safeParse(raw);
  if (!p.success) {
    return NextResponse.json(
      { error: "Invalid body", details: p.error.flatten() },
      { status: 400 }
    );
  }
  const trimmed = p.data.inGameName.trim();
  await connectDB();
  const updated = await User.findByIdAndUpdate(
    s.id,
    { $set: { inGameName: trimmed } },
    { new: true, runValidators: true }
  ).select("inGameName");
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    inGameName: (updated as { inGameName?: string }).inGameName?.trim() ?? "",
  });
}
