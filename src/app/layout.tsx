import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import {
  ConditionalMain,
  getRequestPathname,
  ShowUnlessAdmin,
} from "@/components/layout/conditional-chrome";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { cn } from "@/lib/utils";
import { ColdStartFullPage } from "@/components/layout/cold-start-full-page";
import { MaintenanceModeFullPage } from "@/components/layout/maintenance-mode-full-page";
import { getMaintenanceSnapshot } from "@/lib/maintenance.server";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: {
    default: "Donut Exchange — Sell in-game items for real money",
    template: "%s | Donut Exchange",
  },
  description:
    "Sell 1M in-game money for INR. Live tier rates, instant sell flow, and order tracking.",
  openGraph: {
    title: "Donut Exchange — In-game to INR",
    description: "Live rates, instant sell flow, and trusted payouts for sellers.",
    type: "website",
    locale: "en_IN",
  },
  keywords: [
    "buy game items",
    "sell in-game gold",
    "INR payout",
    "UPI",
    "gaming marketplace",
  ],
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    console.error("[Donut] getServerSession failed in root layout", e);
  }
  const pathname = getRequestPathname();
  const pathNorm = pathname.replace(/\/$/, "") || "/";
  let maintenance = { active: false, supportUrl: "" };
  try {
    maintenance = await getMaintenanceSnapshot();
  } catch (e) {
    console.error("[Donut] getMaintenanceSnapshot failed in root layout", e);
  }
  const role = session?.user?.role;
  const showMaintenance =
    maintenance.active && role !== "ADMIN" && pathNorm !== "/login";
  return (
    <html lang="en" className="dark max-w-[100%] overflow-x-clip">
      <body
        className={cn(
          outfit.variable,
          jetbrains.variable,
          "min-h-dvh min-w-0 max-w-[100%] font-sans",
          "overflow-x-clip",
          "bg-grid-fade"
        )}
        // If /_next/static/css/* 404s (stale .next, dev HMR), Tailwind is missing but HTML still renders
        style={{
          backgroundColor: "rgb(9 9 11)",
          color: "rgb(212 212 216)",
        }}
      >
        <div className="pointer-events-none fixed inset-0 bg-noise" aria-hidden />
        <AppProviders>
          <div className="relative z-10 flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-clip">
            {showMaintenance ? (
              <MaintenanceModeFullPage supportUrl={maintenance.supportUrl} />
            ) : (
              <>
                <ColdStartFullPage />
                <ShowUnlessAdmin>
                  <Navbar />
                </ShowUnlessAdmin>
                <ConditionalMain>{children}</ConditionalMain>
                <ShowUnlessAdmin>
                  <Footer />
                </ShowUnlessAdmin>
                <ShowUnlessAdmin>
                  <MobileNav role={session?.user?.role} pathname={pathname} />
                </ShowUnlessAdmin>
              </>
            )}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
