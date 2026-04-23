"use client";

import { AdminMobileNav, AdminSidebar } from "./admin-sidebar";

export function AdminShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  return (
    <div className="flex min-h-dvh w-full min-w-0 bg-zinc-950">
      <AdminSidebar pathname={pathname} />
      {/*
        min-w-0 is required: flex children default to min-width: auto, so wide tables
        would otherwise expand the page past the viewport instead of scrolling inside TableShell.
      */}
      <div
        data-admin-main-column
        className="flex min-h-dvh min-w-0 max-w-full flex-1 flex-col overflow-x-hidden"
      >
        <AdminMobileNav pathname={pathname} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-3 py-4 sm:px-5 sm:py-6 md:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
