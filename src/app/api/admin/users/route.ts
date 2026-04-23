import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import { Referral } from "@/models/Referral.model";
import { Order } from "@/models/Order.model";
import { AdminNote } from "@/models/AdminNote.model";
import { z } from "zod";
import { Types } from "mongoose";
import { logAdminAction, getRequestIp } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const patchBody = z.object({
  userId: z.string(),
  sellerTier: z.enum(["STANDARD", "GOLD", "DIAMOND"]).optional(),
  riskFlags: z.array(z.string()).optional(),
  note: z.string().max(5000).optional(),
  banned: z.boolean().optional(),
  isVip: z.boolean().optional(),
  referralCodeDisabled: z.boolean().optional(),
  clearReferralAbuse: z.boolean().optional(),
  /** Staff: item slugs (or * ) for SKILL assignment */
  assignmentSkills: z.array(z.string().max(64)).max(100).optional(),
  /** User ↔ staff only; use DB to change Admin. */
  role: z.enum(["USER", "STAFF"]).optional(),
});

export async function GET() {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const users = await User.find()
    .select(
      "name email role sellerTier lifetimeVolumeSold referralCode totalSoldInr firstSellCompleted riskFlags createdAt updatedAt lastActiveAt banned isVip referralCodeDisabled assignmentSkills"
    )
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const orderCounts = await Order.aggregate([
    { $group: { _id: "$userId", n: { $sum: 1 } } },
  ]);
  const oc = new Map(orderCounts.map((x) => [x._id.toString(), x.n as number]));

  const withRefs = await Promise.all(
    users.map(async (u) => {
      const c = await Referral.countDocuments({ referrerId: u._id });
      const nOrders = oc.get(u._id.toString()) ?? 0;
      const flags = u.riskFlags?.length ?? 0;
      const riskScore = Math.min(100, (u.banned ? 60 : 0) + flags * 12 + (u.referralCodeDisabled ? 15 : 0));
      return {
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        sellerTier: u.sellerTier,
        lifetimeVolumeSold: u.lifetimeVolumeSold,
        referralCode: u.referralCode,
        totalSoldInr: u.totalSoldInr,
        firstSellCompleted: u.firstSellCompleted,
        riskFlags: u.riskFlags,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastActiveAt: u.lastActiveAt,
        referralCount: c,
        orderCount: nOrders,
        banned: u.banned ?? false,
        isVip: u.isVip ?? false,
        referralCodeDisabled: u.referralCodeDisabled ?? false,
        riskScore,
        assignmentSkills: (u as { assignmentSkills?: string[] }).assignmentSkills ?? [],
      };
    })
  );
  return NextResponse.json(withRefs);
}

export async function PATCH(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const json = await req.json();
  const p = patchBody.safeParse(json);
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const ip = getRequestIp(req.headers);
  const {
    userId,
    sellerTier,
    riskFlags,
    note,
    banned,
    isVip,
    referralCodeDisabled,
    clearReferralAbuse,
    assignmentSkills,
    role: nextRole,
  } = p.data;
  await connectDB();
  const u = await User.findById(userId);
  if (!u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (sellerTier) u.sellerTier = sellerTier;
  if (riskFlags) u.riskFlags = riskFlags;
  if (banned !== undefined) u.banned = banned;
  if (isVip !== undefined) u.isVip = isVip;
  if (referralCodeDisabled !== undefined) u.referralCodeDisabled = referralCodeDisabled;
  if (clearReferralAbuse) {
    u.riskFlags = (u.riskFlags || []).filter((f: string) => f !== "referral_abuse");
  }
  if (assignmentSkills) {
    (u as { assignmentSkills: string[] }).assignmentSkills = assignmentSkills.map((x) => x.trim()).filter(Boolean);
  }
  if (userId === s.id && nextRole !== undefined) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }
  if (nextRole !== undefined) {
    if (u.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin accounts: change role in the database (safety)" },
        { status: 400 }
      );
    }
    u.role = nextRole;
  }
  await u.save();
  if (note?.trim()) {
    await AdminNote.create({
      userId: new Types.ObjectId(userId),
      authorId: new Types.ObjectId(s.id),
      body: note.trim(),
    });
  }
  void logAdminAction(s.id, "user.patch", { entityId: userId, ip, meta: p.data });
  return NextResponse.json({ ok: true });
}
