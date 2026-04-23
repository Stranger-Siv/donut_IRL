import { headers } from "next/headers";
import { cn } from "@/lib/utils";

export function getRequestPathname(): string {
  return headers().get("x-pathname") || "/";
}

/** Hide public chrome on /admin — server-side (no usePathname). */
export function ShowUnlessAdmin({ children }: { children: React.ReactNode }) {
  const p = getRequestPathname();
  if (p.startsWith("/admin")) return null;
  return <>{children}</>;
}

/** Main column: full-bleed for admin, constrained for marketing. */
export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const p = getRequestPathname();
  if (p.startsWith("/admin")) {
    return <div className="flex min-h-dvh w-full flex-1 flex-col">{children}</div>;
  }
  return (
    <main
      className={cn(
        "mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-3 pb-nav pt-5 sm:px-6 sm:pt-8"
      )}
    >
      {children}
    </main>
  );
}

