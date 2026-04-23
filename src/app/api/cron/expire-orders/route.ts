import { NextResponse } from "next/server";
import { runExpireAllPendingOverdue } from "@/lib/order-expire";

export const dynamic = "force-dynamic";

/** Vercel Cron or external ping: set CRON_SECRET and send Authorization: Bearer <secret> */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const n = await runExpireAllPendingOverdue();
  return NextResponse.json({ ok: true, expired: n });
}
