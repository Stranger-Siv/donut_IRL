import { connectDB } from "./mongodb";
import { WebhookSettings } from "@/models/WebhookSettings.model";

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

export type DiscordEvent =
  | { type: "trade"; body: string }
  | { type: "rate"; body: string }
  | { type: "promo"; body: string }
  | { type: "vouch"; body: string };

async function togglesAllow(event: DiscordEvent): Promise<boolean> {
  try {
    await connectDB();
    const w = await WebhookSettings.findById("global").lean();
    if (!w) return true;
    if (event.type === "trade" && w.completedTrades === false) return false;
    if (event.type === "rate" && w.rateUpdates === false) return false;
    if (event.type === "promo" && w.promotions === false) return false;
    if (event.type === "vouch" && w.vouches === false) return false;
    return true;
  } catch {
    return true;
  }
}

export async function sendDiscordEvent(event: DiscordEvent): Promise<boolean> {
  if (!WEBHOOK) return false;
  if (!(await togglesAllow(event))) return true;
  const title =
    event.type === "trade"
      ? "Completed trade"
      : event.type === "rate"
        ? "Rate change"
        : event.type === "promo"
          ? "Promotion"
          : "New vouch";
  try {
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: event.body,
            color: 0x7c3aed,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
