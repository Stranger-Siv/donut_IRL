import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import { Referral } from "@/models/Referral.model";
import { generateReferralCode } from "@/lib/utils";
import { DB_UNAVAILABLE_USER_MESSAGE, isMongoConnectionError } from "@/lib/db-errors";
import { headers } from "next/headers";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  referralCode: z.string().max(20).optional(),
});

function pickIp(h: Headers) {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    ""
  );
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { name, email, password, referralCode } = parsed.data;
    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "Account already exists" },
        { status: 400 }
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

    const h = await headers();
    const signupIp = pickIp(h);

    const u = await User.create({
      name,
      email,
      passwordHash,
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

    return NextResponse.json({ ok: true, email: u.email });
  } catch (e) {
    if (isMongoConnectionError(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Donut] Register: MongoDB not reachable. Run: docker compose up -d  (or fix MONGODB_URI)\n"
        );
      }
      return NextResponse.json(
        { error: DB_UNAVAILABLE_USER_MESSAGE },
        { status: 503 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
