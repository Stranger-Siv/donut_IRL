import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Expose current pathname to Server Components (avoids usePathname in root chrome,
 * which can throw under Turbopack + ErrorBoundary when React context is not ready).
 * When maintenance is on, non-admin API calls get 503 (layout handles HTML).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !pathname.startsWith("/api/health/") &&
    !pathname.startsWith("/api/maintenance/") &&
    !pathname.startsWith("/api/webhooks/")
  ) {
    const origin = request.nextUrl.origin;
    const statusRes = await fetch(new URL("/api/maintenance/status", origin), {
      method: "GET",
      cache: "no-store",
    });
    if (statusRes.ok) {
      const body = (await statusRes.json()) as { active?: boolean };
      if (body?.active) {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
        });
        if (token?.role !== "ADMIN") {
          return NextResponse.json(
            { error: "Service is under maintenance", code: "MAINTENANCE" },
            { status: 503 }
          );
        }
      }
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Run on pages and on /api (except _next, static, favicon) so we can enforce
 * maintenance on APIs. RSC, Flight, and static assets are skipped.
 */
export const config = {
  matcher: ["/((?!_next/|_vercel|_static/|favicon|.*\\..*).*)"],
};
