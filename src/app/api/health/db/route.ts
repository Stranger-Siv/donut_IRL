import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

/** Safe response for support; strips credentials if any appear in error text. */
function redact(s: string): string {
  return s.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/g, "mongodb://***@");
}

/**
 * GET /api/health/db — checks MongoDB connectivity.
 * If this fails, read `message` and Render logs; fix MONGODB_URI, redeploy, retry.
 */
export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, message: redact(msg) },
      { status: 503 }
    );
  }
}
