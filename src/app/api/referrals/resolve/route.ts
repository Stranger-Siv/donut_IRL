import { NextResponse } from "next/server";
import { getReferrerNameByCode } from "@/lib/referral-lookup";
import {
  DB_UNAVAILABLE_USER_MESSAGE,
  isMongoConnectionError,
} from "@/lib/db-errors";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const code = new URL(req.url).searchParams.get("code");
  if (code == null || !String(code).trim()) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  try {
    const referrerName = await getReferrerNameByCode(String(code));
    return NextResponse.json({ referrerName });
  } catch (e) {
    if (isMongoConnectionError(e)) {
      return NextResponse.json(
        { error: DB_UNAVAILABLE_USER_MESSAGE, referrerName: null },
        { status: 503 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
