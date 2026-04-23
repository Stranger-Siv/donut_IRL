import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import { sendPasswordResetEmail } from "@/lib/mail";
import { DB_UNAVAILABLE_USER_MESSAGE, isMongoConnectionError } from "@/lib/db-errors";
import {
  PASSWORD_RESET_EMAIL_THROTTLE_MS,
  PASSWORD_RESET_EXPIRY_MS,
  createRawResetToken,
  hashPasswordResetToken,
  publicAppBaseUrl,
} from "@/lib/password-reset-token";

const bodySchema = z.object({
  email: z.string().email(),
});

const PUBLIC_MESSAGE = "If an account exists for that email, we sent a reset link.";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  try {
    await connectDB();
    const u = await User.findOne({ email }).select(
      "email banned passwordResetLastSentAt"
    );
    if (!u || u.banned) {
      if (process.env.NODE_ENV === "development" && !u) {
        console.info(
          `[forgot-password] no account for ${email} — no email is sent (use the same email you registered with)`
        );
      }
      return NextResponse.json({ ok: true, message: PUBLIC_MESSAGE });
    }

    const last = u.passwordResetLastSentAt as Date | null | undefined;
    if (last && Date.now() - new Date(last).getTime() < PASSWORD_RESET_EMAIL_THROTTLE_MS) {
      return NextResponse.json({ ok: true, message: PUBLIC_MESSAGE });
    }

    const raw = createRawResetToken();
    const tokenHash = hashPasswordResetToken(raw);
    u.passwordResetTokenHash = tokenHash;
    u.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
    u.passwordResetLastSentAt = new Date();
    await u.save();

    const base = publicAppBaseUrl();
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(raw)}`;
    try {
      await sendPasswordResetEmail({ to: u.email!, resetUrl });
    } catch (e) {
      u.passwordResetTokenHash = "";
      u.passwordResetExpires = null;
      u.passwordResetLastSentAt = last || null;
      await u.save();
      console.error("[forgot-password] send failed:", e);
      return NextResponse.json(
        { error: "We could not send the email. Try again later or contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, message: PUBLIC_MESSAGE });
  } catch (e) {
    if (isMongoConnectionError(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Donut] forgot-password: MongoDB not reachable. Run: docker compose up -d  (or fix MONGODB_URI)\n"
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
