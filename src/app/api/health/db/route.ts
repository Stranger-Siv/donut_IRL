import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

/** For cross-origin wake-loader pages (static host) that poll this URL before redirecting. */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS, HEAD",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: NextResponse) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

/** Safe response for support; strips credentials if any appear in error text. */
function redact(s: string): string {
  return s.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/g, "mongodb://***@");
}

/** Host in MONGODB_URI (compare to Atlas SRV host); no password. */
function clusterHostFromEnv(): string | null {
  const raw = process.env.MONGODB_URI;
  if (!raw) return null;
  const m = raw.match(/@([^/?#]+)/);
  return m ? m[1] : null;
}

/**
 * GET /api/health/db — checks MongoDB connectivity.
 * If this fails, read `message` and Render logs; fix MONGODB_URI, redeploy, retry.
 * Note: Atlas often says "whitelist" for *any* server selection failure; use `clusterHostInEnv` vs your Atlas cluster.
 */
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  const clusterHostInEnv = clusterHostFromEnv();
  try {
    await connectDB();
    return withCors(NextResponse.json({ ok: true, clusterHostInEnv }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = redact(err.message);
    const any = e as { name?: string };
    return withCors(
      NextResponse.json(
        {
          ok: false,
          message: msg,
          errorName: any?.name,
          clusterHostInEnv,
          note:
            "If clusterHostInEnv does not match your cluster's SRV host in Atlas, fix MONGODB_URI. " +
            "The Atlas 'whitelist' text also appears for bad hostname, wrong password, or paused cluster — not only IP rules.",
        },
        { status: 503 }
      )
    );
  }
}
