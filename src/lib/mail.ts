import nodemailer from "nodemailer";

const SUBJECT = "Reset your Donut IRL password";

type SendParams = { to: string; resetUrl: string };

/**
 * Resend (HTTPS) or SMTP via nodemailer. In development with no config, logs the link to the server console.
 */
export async function sendPasswordResetEmail({ to, resetUrl }: SendParams): Promise<void> {
  const text = [
    "You (or someone) asked to set a new password for your Donut IRL account (real-money sales for Donut SMP).",
    "",
    `Open this link within 1 hour: ${resetUrl}`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const safeUrl = resetUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = [
    "<p>You (or someone) asked to set a new password for your Donut IRL account.</p>",
    `<p><a href="${resetUrl}">Set a new password</a></p>`,
    `<p style="word-break:break-all;font-size:12px;color:#666;">${safeUrl}</p>`,
    "<p>If you did not request this, you can ignore this email.</p>",
  ].join("");

  if (process.env.RESEND_API_KEY) {
    const from =
      process.env.EMAIL_FROM || "Donut IRL <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject: SUBJECT,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Resend error ${res.status}: ${errBody.slice(0, 500)}`);
    }
    return;
  }

  if (process.env.SMTP_HOST) {
    const hasAuth = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
    const useGmailShortcut =
      process.env.SMTP_HOST === "smtp.gmail.com" && hasAuth;
    const transporter = nodemailer.createTransport(
      useGmailShortcut
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
            ...(hasAuth
              ? {
                  auth: {
                    user: process.env.SMTP_USER!,
                    pass: process.env.SMTP_PASS!,
                  },
                }
              : {}),
          }
    );
    const smtpFrom =
      process.env.EMAIL_FROM ||
      (process.env.SMTP_USER ? `Donut IRL <${process.env.SMTP_USER}>` : "Donut IRL <noreply@localhost>");
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: SUBJECT,
      text,
      html,
    });
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "\n[Donut] Password reset email (no RESEND / SMTP configured — link for dev only):\n",
      to,
      "\n",
      resetUrl,
      "\n"
    );
    return;
  }

  throw new Error("Email is not configured (set RESEND_API_KEY or SMTP_HOST)");
}
