import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { AppSettings } from "@/models/AppSettings.model";
import { logAdminAction, getRequestIp } from "@/lib/admin-audit";
import { REFERRAL_REWARD_IG } from "@/lib/constants";
import { invalidateMaintenanceCache } from "@/lib/maintenance.server";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

const patch = z
  .object({
    maintenanceMode: z.boolean().optional(),
    minSellQuantityM: z.number().min(0.0001).optional(),
    minSellItemUnits: z.number().min(0.0001).optional(),
    referralRewardM: z.string().max(20).optional(),
    currencySymbol: z.string().max(8).optional(),
    timezone: z.string().max(64).optional(),
    supportUrl: z.string().max(2000).optional(),
    autoCancelHours: z.number().min(0).nullable().optional(),
    globalPricingPaused: z.boolean().optional(),
    emergencyPause: z.boolean().optional(),
    adminIpAllowlist: z.string().max(10000).optional(),
    twoFactorEnforced: z.boolean().optional(),
    defaultSlaHours: z.number().min(1).max(720).optional(),
    businessDayStart: z.string().max(8).optional(),
    businessDayEnd: z.string().max(8).optional(),
    businessDays: z.string().max(32).optional(),
    assignmentMode: z.enum(["MANUAL", "ROUND_ROBIN", "LOAD", "SKILL"]).optional(),
    itemDailyCapacity: z.record(z.string(), z.number().min(0)).optional(),
    displayFxUsdInr: z.number().min(1).max(500).optional(),
    displayFxEurInr: z.number().min(1).max(500).optional(),
  })
  .strict();

export async function GET(req: Request) {
  const m = await maintenanceResponseIfBlocked(req);
  if (m) return m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  let doc = await AppSettings.findById("global").lean();
  if (!doc) {
    await AppSettings.create({ _id: "global" });
    doc = (await AppSettings.findById("global").lean())!;
  }
  return NextResponse.json({
    ...doc,
    minSellItemUnits: doc.minSellItemUnits ?? 1,
    referralRewardMDefault: REFERRAL_REWARD_IG,
  });
}

export async function PATCH(req: Request) {
  const m = await maintenanceResponseIfBlocked(req);
  if (m) return m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const p = patch.safeParse(body);
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const doc = await AppSettings.findById("global");
  if (!doc) {
    await AppSettings.create({ _id: "global", ...p.data });
  } else {
    Object.assign(doc, p.data);
    await doc.save();
  }
  invalidateMaintenanceCache();
  await logAdminAction(s.id, "settings.update", { ip: getRequestIp(req.headers) });
  return NextResponse.json({ ok: true });
}
