import { NextResponse } from "next/server";
import { z } from "zod";
import { sendDiscordEvent } from "@/lib/discord";
import { getSessionUser } from "@/lib/api-auth";

const bodySchema = z.object({
  kind: z.enum(["promo", "vouch"]),
  text: z.string().min(1).max(2000),
});

async function isAuthorized(req: Request) {
  const key = req.headers.get("x-internal-key");
  if (process.env.INTERNAL_DISCORD_KEY && key === process.env.INTERNAL_DISCORD_KEY) {
    return true;
  }
  const s = await getSessionUser();
  return !!(s && s.role === "ADMIN");
}

/**
 * Post promo or vouch text to the configured Discord webhook.
 * Admin session or INTERNAL_DISCORD_KEY header.
 */
export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const json = await req.json();
  const p = bodySchema.safeParse(json);
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { kind, text } = p.data;
  const event =
    kind === "promo"
      ? { type: "promo" as const, body: text }
      : { type: "vouch" as const, body: text };
  const ok = await sendDiscordEvent(event);
  return NextResponse.json({ ok, delivered: ok });
}
