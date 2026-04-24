import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Expose current pathname to Server Components. Do not fetch subrequests here
 * (e.g. to /api/...) — on hosts like Render, TLS to the public URL from inside
 * the Node/Edge layer can break (ERR_SSL_PACKET_LENGTH_TOO_LONG). Maintenance
 * for APIs is enforced in @/lib/maintenance-api-guard.server per route.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * API routes are excluded: same as before, so RSC/Flight to /api are untouched.
 * x-pathname is only needed for page navigations in the root layout.
 */
export const config = {
  matcher: ["/((?!_next|_vercel|api|_static/|favicon|.*\\..*).*)"],
};
