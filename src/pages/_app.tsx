import type { AppProps } from "next/app";
import "../app/globals.css";

/**
 * Minimal Pages Router shell so dev/prod can always resolve `/_error` and avoid
 * "missing required error components, refreshing..." when the App Router error
 * bundle is temporarily unavailable (Turbopack HMR, deleted .next, etc.).
 * Also ensures Tailwind/styles apply if a Pages path is ever hit in this hybrid app.
 */
export default function PagesApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
