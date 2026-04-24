import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { LogoutButton } from "./logout-button";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/sell", label: "Sell" },
  { href: "/dashboard", label: "Dashboard" },
];

export async function Navbar() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    console.error("[Donut] getServerSession failed in Navbar", e);
  }
  const role = session?.user?.role;
  const links = [
    ...publicLinks,
    ...(session && role === "USER" ? ([{ href: "/wallet", label: "Wallet" }] as const) : []),
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-white/10",
        "bg-zinc-950/85 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 min-h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="group focus-brand flex min-w-0 max-w-[min(100%,11rem)] items-center gap-2 rounded-lg font-semibold tracking-tight sm:max-w-none"
        >
          <span className="grid h-9 w-9 shrink-0 place-content-center rounded-lg bg-violet-600/20 text-violet-300 ring-1 ring-inset ring-violet-500/30 transition group-hover:bg-violet-500/20">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <span className="truncate text-sm text-zinc-100 sm:text-base">
            Donut<span className="text-violet-400"> IRL</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="focus-brand rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
          {session && role !== "ADMIN" && (
            <Link
              href="/referrals"
              className="focus-brand rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
            >
              Referrals
            </Link>
          )}
          {role === "STAFF" && (
            <Link
              href="/staff"
              className="focus-brand rounded-md px-3 py-1.5 text-sm text-cyan-400 transition hover:bg-cyan-500/10"
            >
              Staff
            </Link>
          )}
          {role === "ADMIN" && (
            <Link
              href="/admin"
              className="focus-brand rounded-md px-3 py-1.5 text-sm text-amber-200 transition hover:bg-amber-500/10"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {session ? (
            <LogoutButton />
          ) : (
            <>
              <Link
                href="/login"
                className="focus-brand min-h-10 min-w-0 rounded-md px-2 py-2 text-xs text-zinc-300 transition hover:text-white sm:px-3 sm:text-sm"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="focus-brand min-h-10 rounded-md bg-violet-600 px-2.5 py-2 text-xs font-medium text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500 sm:px-3 sm:text-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
