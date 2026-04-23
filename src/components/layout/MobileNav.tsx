"use client";

import Link from "next/link";
import { Home, LineChart, LayoutDashboard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { type AppRole } from "@/types/next-auth";

const base = [
  { href: "/", label: "Home", icon: Home },
  { href: "/sell", label: "Sell", icon: LineChart },
  { href: "/dashboard", label: "You", icon: LayoutDashboard },
];

export function MobileNav({
  role,
  pathname,
}: {
  role?: AppRole | string;
  pathname: string;
}) {
  const items = [...base];
  if (role === "STAFF" || role === "ADMIN")
    items.push({ href: "/staff", label: "Staff", icon: Shield });
  if (role === "ADMIN")
    items.push({ href: "/admin", label: "Admin", icon: Shield });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/95 p-1 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] backdrop-blur-lg sm:hidden">
      <div className="mx-auto flex max-w-lg justify-around">
        {items.slice(0, 4).map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium",
                active ? "text-violet-400" : "text-zinc-500"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
