"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { Menu, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/pricing", label: "Live pricing" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/discord", label: "Discord" },
  { href: "/admin/fraud", label: "Fraud & risk" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/security", label: "Security" },
] as const;

function navActive(path: string, item: (typeof NAV)[number]) {
  const isExact = "exact" in item && item.exact;
  return isExact
    ? path === item.href
    : path === item.href || path?.startsWith(`${item.href}/`);
}

function SidebarBrand() {
  return (
    <div className="border-b border-white/5 px-4 py-4 sm:px-5 sm:py-5">
      <Link
        href="/admin"
        className="block font-semibold tracking-tight text-zinc-100 transition hover:text-white"
      >
        Donut<span className="text-violet-400"> IRL</span>{" "}
        <span className="text-violet-500/80">Admin</span>
      </Link>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Operations
      </p>
    </div>
  );
}

type NavListProps = {
  pathname: string;
  onNavigate?: () => void;
  variant: "desktop" | "drawer";
};

function NavList({ pathname, onNavigate, variant }: NavListProps) {
  const isDrawer = variant === "drawer";
  return (
    <nav
      className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-2.5 sm:py-4"
      aria-label="Admin"
    >
      {NAV.map((item) => {
        const active = navActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium transition-colors",
              isDrawer && "active:bg-white/5",
              active
                ? "bg-violet-500/12 text-violet-100 before:absolute before:left-0 before:top-1/2 before:h-6 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-violet-400"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t border-white/5 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href="/"
        onClick={onNavigate}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-violet-400/90 transition hover:text-violet-300"
      >
        <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
        Public site
      </Link>
    </div>
  );
}

/** Fixed left rail — md+ and lg+ in shell use same visual; shown lg and up. */
export function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <aside
      data-admin-desktop-nav
      className="fixed left-0 top-0 z-30 hidden h-dvh w-64 min-w-64 max-w-[min(16rem,100%)] flex-col border-r border-white/5 bg-zinc-950/95 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:flex"
      aria-label="Admin navigation"
    >
      <SidebarBrand />
      <NavList pathname={pathname} variant="desktop" />
      <SidebarFooter />
    </aside>
  );
}

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  titleId: string;
};

function AdminNavDrawer({ open, onClose, pathname, titleId }: DrawerProps) {
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm transition-opacity"
        onClick={close}
        aria-label="Close menu"
      />
      <aside
        id="admin-mobile-drawer"
        className={cn(
          "admin-drawer-in absolute left-0 top-0 flex h-dvh w-[min(20rem,100%)] max-w-full flex-col",
          "border-r border-white/10 bg-zinc-950 shadow-2xl"
        )}
      >
        <div className="flex h-14 min-h-14 shrink-0 items-center justify-between border-b border-white/5 px-3 pl-4 pr-2 sm:h-[3.5rem]">
          <h2 id={titleId} className="text-sm font-semibold text-zinc-100">
            Menu
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid h-11 w-11 shrink-0 place-content-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-white/5 px-3 py-3 sm:px-4">
              <Link
                href="/admin"
                onClick={close}
                className="text-xs font-medium uppercase tracking-widest text-zinc-500"
              >
                Donut<span className="text-violet-400"> IRL</span>{" "}
                <span className="text-violet-500/80">Admin</span>
              </Link>
            </div>
            <NavList pathname={pathname} onNavigate={close} variant="drawer" />
            <SidebarFooter onNavigate={close} />
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Sticky top bar on small screens + controlled drawer. */
export function AdminMobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <header
        data-admin-mobile-header
        className="sticky top-0 z-40 flex h-14 min-h-14 w-full min-w-0 max-w-full shrink-0 items-center gap-2 overflow-x-clip border-b border-white/5 bg-zinc-950/92 px-2 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/88 sm:gap-3 sm:px-3 lg:hidden"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-11 w-11 shrink-0 place-content-center rounded-xl border border-white/10 bg-zinc-900/50 text-zinc-200 transition hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200"
          aria-expanded={open}
          aria-controls="admin-mobile-drawer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">
            Donut<span className="text-violet-400"> IRL</span>{" "}
            <span className="text-violet-500/80">Admin</span>
          </p>
          <p className="truncate text-[10px] text-zinc-500">Operations</p>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
        >
          <span className="max-[380px]:sr-only sm:inline">Site</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      </header>
      <AdminNavDrawer
        open={open}
        onClose={close}
        pathname={pathname}
        titleId={titleId}
      />
    </>
  );
}
