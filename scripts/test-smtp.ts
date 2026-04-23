/**
 * Send one test message using the same env as the app (RESEND or SMTP).
 *
 *   npm run test-smtp -- you@email.com
 *
 * If you omit the address, uses SMTP_USER as the recipient.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import nodemailer from "nodemailer";

const to = process.argv[2]?.trim() || process.env.SMTP_USER;

async function main() {
  if (process.env.RESEND_API_KEY) {
    const from =
      process.env.EMAIL_FROM || "Donut IRL <onboarding@resend.dev>";
    if (!to) {
      console.error("Pass a recipient: npm run test-smtp -- you@email.com");
      process.exit(1);
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Donut IRL — SMTP/Resend test",
        text: "If you see this, outbound mail works.",
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("Resend failed:", res.status, body);
      process.exit(1);
    }
    console.log("Resend ok. Check inbox for", to);
    return;
  }

  if (process.env.SMTP_HOST) {
    if (!to) {
      console.error("Set SMTP_USER or pass: npm run test-smtp -- you@email.com");
      process.exit(1);
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("Set SMTP_USER and SMTP_PASS in .env.local");
      process.exit(1);
    }
    const hasAuth = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
    const useGmail =
      process.env.SMTP_HOST === "smtp.gmail.com" && hasAuth;
    const transporter = nodemailer.createTransport(
      useGmail
        ? {
            service: "gmail",
            auth: {
              user: process.env.SMTP_USER!,
              pass: process.env.SMTP_PASS!,
            },
          }
        : {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
              user: process.env.SMTP_USER!,
              pass: process.env.SMTP_PASS!,
            },
          }
    );
    const from =
      process.env.EMAIL_FROM || `Donut IRL <${process.env.SMTP_USER}>`;
    const info = await transporter.sendMail({
      from,
      to,
      subject: "Donut IRL — SMTP test",
      text: "If you see this, Gmail/SMTP from this app works.",
    });
    console.log("Sent:", info.messageId, "→", to);
    return;
  }

  console.error(
    "No RESEND_API_KEY and no SMTP_HOST in .env.local — nothing to test."
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
