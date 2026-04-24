import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { getMaintenanceSnapshot } from "@/lib/maintenance.server";

/** No guard — used by public probes and same-process hooks. */
function isAlwaysPublicPath(path: string) {
  return (
    path.startsWith("/api/health/") ||
    path.startsWith("/api/maintenance/") ||
    path.startsWith("/api/webhooks/") ||
    path.startsWith("/api/cron/")
  );
}

/**
 * NextAuth lives under /api/auth/*; allow sign-in/session/callback, block
 * register/forgot/reset for non-admins when maintenance is on.
 */
function isNextAuthExemptPath(path: string) {
  if (!path.startsWith("/api/auth/")) return false;
  if (path === "/api/auth/register" || path.startsWith("/api/auth/register/")) return false;
  if (path === "/api/auth/forgot-password" || path.startsWith("/api/auth/forgot-password/")) {
    return false;
  }
  if (path === "/api/auth/reset-password" || path.startsWith("/api/auth/reset-password/")) {
    return false;
  }
  return true;
}

/**
 * Returns a 503 response when the site is in maintenance and the user is not an
 * admin. Call at the start of every Route Handler (except NextAuth catch-all if
 * you want session/sign-in to work — those paths are excluded here). Safe to
 * call for public routes: health, maintenance, webhooks, and cron are skipped.
 */
export async function maintenanceResponseIfBlocked(req: Request): Promise<NextResponse | null> {
  const path = new URL(req.url).pathname;
  if (isAlwaysPublicPath(path) || isNextAuthExemptPath(path)) {
    return null;
  }
  const snap = await getMaintenanceSnapshot();
  if (!snap.active) {
    return null;
  }
  const u = await getSessionUser();
  if (u?.role === "ADMIN") {
    return null;
  }
  return NextResponse.json(
    { error: "Service is under maintenance", code: "MAINTENANCE" },
    { status: 503 }
  );
}
