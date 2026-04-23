import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { WebhookSettings } from "@/models/WebhookSettings.model";
import { logAdminAction, getRequestIp } from "@/lib/admin-audit";
import { sendDiscordEvent } from "@/lib/discord";

export const dynamic = "force-dynamic";

const patch = z
  .object({
    completedTrades: z.boolean().optional(),
    rateUpdates: z.boolean().optional(),
    promotions: z.boolean().optional(),
    vouches: z.boolean().optional(),
    templateTrade: z.string().max(1000).optional(),
    templateRate: z.string().max(1000).optional(),
    templatePromo: z.string().max(1000).optional(),
  })
  .strict();

export async function GET() {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  let w = await WebhookSettings.findById("global").lean();
  if (!w) {
    await WebhookSettings.create({ _id: "global" });
    w = (await WebhookSettings.findById("global").lean())!;
  }
  return NextResponse.json(w);
}

export async function PATCH(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const p = patch.safeParse(await req.json());
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const doc = await WebhookSettings.findById("global");
  if (!doc) {
    await WebhookSettings.create({ _id: "global", ...p.data });
  } else {
    Object.assign(doc, p.data);
    await doc.save();
  }
  await logAdminAction(s.id, "webhookSettings.update", { ip: getRequestIp(req.headers) });
  return NextResponse.json({ ok: true });
}

const testBody = z.object({ type: z.enum(["promo", "rate", "trade", "vouch"]) });

export async function POST(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const p = testBody.safeParse(await req.json());
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const t = p.data.type;
  const ok = await sendDiscordEvent(
    t === "promo"
      ? { type: "promo", body: "Admin test: promotions channel" }
      : t === "rate"
        ? { type: "rate", body: "Admin test: rate update" }
        : t === "trade"
          ? { type: "trade", body: "Admin test: completed trade feed" }
          : { type: "vouch", body: "Admin test: vouch" }
  );
  return NextResponse.json({ ok, message: ok ? "Sent" : "Check DISCORD_WEBHOOK_URL" });
}
