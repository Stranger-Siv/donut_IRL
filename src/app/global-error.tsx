"use client";

import "./globals.css";

/**
 * Catches errors in the root `layout.tsx` (e.g. session failure). The default
 * Next handler can hit the same Turbopack + `usePathname` issue as `error.tsx`
 * is meant to work around for segment errors. Import globals here because this
 * UI replaces the entire root layout (no inherited stylesheets).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className="min-h-dvh bg-zinc-950 font-sans text-zinc-100 antialiased"
        style={{ backgroundColor: "rgb(9 9 11)", color: "rgb(244 244 245)" }}
      >
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 break-words text-sm text-zinc-500">{error.message}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
