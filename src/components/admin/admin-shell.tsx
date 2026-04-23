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
    <div className="flex min-h-dvh w-full bg-zinc-950">
      <AdminSidebar pathname={pathname} />
      <div className="flex min-h-dvh flex-1 flex-col lg:pl-64">
        <AdminMobileNav pathname={pathname} />
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-5 sm:py-6 md:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
