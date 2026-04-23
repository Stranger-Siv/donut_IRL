import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Expose current pathname to Server Components (avoids usePathname in root chrome,
 * which can throw under Turbopack + ErrorBoundary when React context is not ready).
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Run only on real app routes. Skipping the whole `/_next` prefix is critical:
 * RSC, Flight, webpack-HMR, etc. live there; running middleware (extra headers)
 * on those requests can break soft navigation and leave pages without the CSS
 * loaded from the root layout.
 */
export const config = {
  matcher: ["/((?!_next|_vercel|api|_static/|favicon|.*\\..*).*)"],
};
