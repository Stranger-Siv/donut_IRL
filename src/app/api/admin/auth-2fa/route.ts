import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import bcrypt from "bcryptjs";
import { newTotpSecret, buildOtpauthUrl, verifyTotpCode } from "@/lib/totp-donut";
import { logAdminAction, getRequestIp } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

/** Whether this admin has a pending or active TOTP. */
export async function GET() {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const u = await User.findById(s.id).select("+totpSecret totpEnabled");
  if (!u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const hasSecret = Boolean((u as { totpSecret?: string }).totpSecret);
  return NextResponse.json({
    totpEnabled: (u as { totpEnabled?: boolean }).totpEnabled ?? false,
    hasSecret,
  });
}

const setupBody = z.object({ action: z.literal("setup") });
const enableBody = z.object({
  action: z.literal("enable"),
  code: z.string().min(4).max(12),
});
const disableBody = z.object({
  action: z.literal("disable"),
  code: z.string().min(4).max(12),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await req.json();
  if (raw?.action === "setup") {
    const p = setupBody.safeParse(raw);
    if (!p.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    await connectDB();
    const u = await User.findById(s.id).select("totpSecret totpEnabled email name");
    if (!u) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if ((u as { totpEnabled?: boolean }).totpEnabled) {
      return NextResponse.json(
        { error: "Disable 2FA first, or use rotate (disable then setup)." },
        { status: 400 }
      );
    }
    const secret = newTotpSecret();
    (u as { totpSecret: string }).totpSecret = secret;
    (u as { totpEnabled: boolean }).totpEnabled = false;
    await u.save();
    const email = (u as { email: string }).email;
    const otpauthUrl = buildOtpauthUrl(email, secret);
    await logAdminAction(s.id, "2fa.setup_secret", { ip: getRequestIp(req.headers) });
    return NextResponse.json({
      otpauthUrl,
      secret,
      message: "Add this in Google Authenticator, then call enable with a current code.",
    });
  }
  if (raw?.action === "enable") {
    const p = enableBody.safeParse(raw);
    if (!p.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    await connectDB();
    const u = await User.findById(s.id).select("+totpSecret");
    if (!u) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const secret = (u as { totpSecret: string }).totpSecret;
    if (!secret) {
      return NextResponse.json({ error: "Run setup first" }, { status: 400 });
    }
    if ((u as { totpEnabled: boolean }).totpEnabled) {
      return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
    }
    if (!verifyTotpCode(secret, p.data.code)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    (u as { totpEnabled: boolean }).totpEnabled = true;
    await u.save();
    await logAdminAction(s.id, "2fa.enable", { ip: getRequestIp(req.headers) });
    return NextResponse.json({ ok: true });
  }
  if (raw?.action === "disable") {
    const p = disableBody.safeParse(raw);
    if (!p.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    await connectDB();
    const u = await User.findById(s.id).select("+passwordHash +totpSecret totpEnabled");
    if (!u) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ph = (u as { passwordHash: string }).passwordHash;
    const okPw = await bcrypt.compare(p.data.password, ph);
    if (!okPw) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }
    const secret = (u as { totpSecret: string }).totpSecret;
    if (!secret || !(u as { totpEnabled: boolean }).totpEnabled) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }
    if (!verifyTotpCode(secret, p.data.code)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    (u as { totpSecret: string }).totpSecret = "";
    (u as { totpEnabled: boolean }).totpEnabled = false;
    await u.save();
    await logAdminAction(s.id, "2fa.disable", { ip: getRequestIp(req.headers) });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
