import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { Price } from "@/models/Price.model";
import { Order } from "@/models/Order.model";
import { User } from "@/models/User.model";
import { Referral } from "@/models/Referral.model";
import { getTierRates } from "@/lib/rate-settings";
import { getSellMinimums } from "@/lib/sell-minimums";
import { computeOrderAmounts } from "@/lib/payout-calc";
import { generateReferralCode } from "@/lib/utils";
import {
  isPublicCatalogItem,
  normalizeOrderItemSlug,
  orderItemSlugCandidates,
} from "@/lib/catalog-scope";
import { headers } from "next/headers";
import { AppSettings } from "@/models/AppSettings.model";
import { checkItemCapacity } from "@/lib/capacity-orders";
import { suggestStaffForItem } from "@/lib/staff-assignment";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

const orderFields = z.object({
  itemSlug: z.string().min(1),
  quantity: z.number().positive(),
  payoutMethod: z.enum(["UPI", "BANK", "CRYPTO"]),
  payoutDetails: z.string().min(1).max(2000),
});

const guestExtra = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
  name: z.string().min(2).max(80).optional(),
  referralCode: z.string().max(20).optional(),
});

const guestSchema = orderFields.merge(guestExtra).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function pickIp(h: Headers) {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    ""
  );
}

export async function GET() {
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (s.role === "STAFF") {
    return NextResponse.json(
      { error: "Use the staff API for assigned orders" },
      { status: 400 }
    );
  }
  if (s.role === "ADMIN") {
    return NextResponse.json([]);
  }
  await connectDB();
  const mine = await Order.find({ userId: s.id })
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(
    mine.map((o) => ({
      _id: o._id.toString(),
      userId: o.userId.toString(),
      itemName: o.itemName,
      itemSlug: o.itemSlug,
      quantity: o.quantity,
      payoutAmount: o.payoutAmount,
      status: o.status,
      createdAt: o.createdAt,
    }))
  );
}

async function createOrderForUser(
  u: InstanceType<typeof User>,
  slug: string,
  quantity: number,
  payoutMethod: "UPI" | "BANK" | "CRYPTO",
  payoutDetails: string
) {
  await connectDB();
  const norm = normalizeOrderItemSlug(slug);
  const price = await Price.findOne({
    itemSlug: { $in: orderItemSlugCandidates(norm) },
    active: true,
  }).lean();
  if (!price) {
    return { error: "Item not found" as const, status: 400 as const };
  }
  if (!isPublicCatalogItem(price as { kind?: string; itemSlug?: string; active?: boolean })) {
    return { error: "This item is not available to sell" as const, status: 400 as const };
  }

  const cap = await checkItemCapacity(
    price.itemSlug,
    (await AppSettings.findById("global").lean())?.itemDailyCapacity as
      | Record<string, number>
      | undefined
  );
  if (!cap.ok) {
    return { error: cap.message, status: 400 as const, code: "CAPACITY_FULL" as const };
  }

  const rates = await getTierRates();
  const life = u.lifetimeVolumeSold || 0;
  const p = price as {
    itemSlug: string;
    currentPrice: number;
    kind?: string;
    equivalentMPerUnit?: number;
  };
  const mins = await getSellMinimums();
  if (quantity < mins.minSellQuantityM) {
    return {
      error: `Minimum in-game money order is ${mins.minSellQuantityM}× 1M. Increase quantity or change the minimum in Admin → Settings.` as const,
      status: 400 as const,
    };
  }

  const amounts = computeOrderAmounts(life, rates, {
    itemSlug: p.itemSlug,
    kind: "CURRENCY",
    currentPrice: p.currentPrice,
    equivalentMPerUnit: p.equivalentMPerUnit,
  }, quantity);

  const settings = await AppSettings.findById("global").lean();
  const hours = settings?.autoCancelHours;
  const autoCancelAt =
    hours != null && hours > 0
      ? new Date(Date.now() + hours * 60 * 60 * 1000)
      : null;

  const o = await Order.create({
    userId: u._id,
    itemName: price.itemName,
    itemSlug: price.itemSlug,
    itemType: "CURRENCY",
    quantity,
    equivalentVolume: amounts.equivalentVolume,
    unitPrice: amounts.unitPrice,
    basePayoutInr: amounts.basePayoutInr,
    tierBonusInr: amounts.tierBonusInr,
    payoutAmount: amounts.payoutAmount,
    originalPayoutInr: amounts.payoutAmount,
    sellerTierAtOrder: amounts.sellerTierAtOrder,
    payoutMethod,
    payoutDetails,
    status: "PENDING",
    autoCancelAt,
    fulfilledQuantity: quantity,
  });

  if (settings && settings.assignmentMode && settings.assignmentMode !== "MANUAL") {
    const pick = await suggestStaffForItem(price.itemSlug);
    if (pick) {
      o.assignedTo = new Types.ObjectId(pick.staffId);
      o.status = "ASSIGNED";
      o.autoCancelAt = null;
      await o.save();
    }
  }

  return { _id: o._id.toString(), status: o.status };
}

export async function POST(req: Request) {
  const json = await req.json();
  const s = await getSessionUser();
  const h = await headers();
  const signupIp = pickIp(h);

  if (s && s.role === "USER") {
    const parsed = orderFields.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    await connectDB();
    const u = await User.findById(s.id);
    if (!u) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    u.lastIp = signupIp || u.lastIp;
    await u.save();
    const slug = normalizeOrderItemSlug(parsed.data.itemSlug);
    const res = await createOrderForUser(
      u,
      slug,
      parsed.data.quantity,
      parsed.data.payoutMethod,
      parsed.data.payoutDetails
    );
    if ("error" in res) {
      const e = res as { error: string; status: number; code?: string };
      return NextResponse.json(
        { error: e.error, ...(e.code ? { code: e.code } : {}) },
        { status: e.status }
      );
    }
    return NextResponse.json(res);
  }

  if (s && s.role !== "USER") {
    return NextResponse.json(
      { error: "Use a user account to sell" },
      { status: 403 }
    );
  }

  const parsed = guestSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] || parsed.error.message || "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const {
    itemSlug,
    quantity,
    payoutMethod,
    payoutDetails,
    email,
    password,
    name,
    referralCode,
  } = parsed.data;
  const slug = normalizeOrderItemSlug(itemSlug);

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json(
      {
        error: "An account with this email already exists. Log in, then place your order.",
        code: "EXISTING_EMAIL",
      },
      { status: 409 }
    );
  }

  let refUser = null;
  if (referralCode?.trim()) {
    const code = referralCode.trim().toUpperCase();
    refUser = await User.findOne({ referralCode: code });
    if (!refUser) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let ownCode = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const taken = await User.findOne({ referralCode: ownCode });
    if (!taken) break;
    ownCode = generateReferralCode();
  }

  const displayName = name?.trim() || email.split("@")[0] || "Seller";

  const u = await User.create({
    name: displayName,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "USER",
    sellerTier: "STANDARD",
    lifetimeVolumeSold: 0,
    referralCode: ownCode,
    referredBy: refUser?._id ?? null,
    signupIp,
    lastIp: signupIp,
  });

  if (refUser) {
    await Referral.create({
      referrerId: refUser._id,
      referredId: u._id,
      code: refUser.referralCode!,
      referredIp: signupIp,
      progressVolumeM: 0,
    });
  }

  const res = await createOrderForUser(
    u,
    slug,
    quantity,
    payoutMethod,
    payoutDetails
  );
  if ("error" in res) {
    await User.deleteOne({ _id: u._id });
    const e = res as { error: string; status: number; code?: string };
    return NextResponse.json(
      { error: e.error, ...(e.code ? { code: e.code } : {}) },
      { status: e.status }
    );
  }

  return NextResponse.json({
    _id: res._id,
    status: res.status,
    createdAccount: true,
    email: u.email,
  });
}
