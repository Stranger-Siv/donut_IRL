import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import { DB_UNAVAILABLE_USER_MESSAGE, isMongoConnectionError } from "@/lib/db-errors";
import { hashPasswordResetToken } from "@/lib/password-reset-token";

const bodySchema = z.object({
  token: z.string().min(1).max(500),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid token or password (password: 8+ characters)" },
      { status: 400 }
    );
  }
  const { token: raw, password } = parsed.data;
  const tokenHash = hashPasswordResetToken(raw.trim());

  try {
    await connectDB();
    const u = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordHash +passwordResetTokenHash");

    if (!u) {
      return NextResponse.json(
        { error: "This link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }
    if (u.banned) {
      return NextResponse.json({ error: "This account is disabled." }, { status: 403 });
    }

    u.passwordHash = await bcrypt.hash(password, 12);
    u.passwordResetTokenHash = "";
    u.passwordResetExpires = null;
    u.passwordResetLastSentAt = null;
    await u.save();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isMongoConnectionError(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Donut] reset-password: MongoDB not reachable. Run: docker compose up -d  (or fix MONGODB_URI)\n"
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
