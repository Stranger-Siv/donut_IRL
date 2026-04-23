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
        "bg-zinc-950/80 backdrop-blur-xl"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="group focus-brand flex items-center gap-2 rounded-lg font-semibold tracking-tight"
        >
          <span className="grid h-9 w-9 place-content-center rounded-lg bg-violet-600/20 text-violet-300 ring-1 ring-inset ring-violet-500/30 transition group-hover:bg-violet-500/20">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <span className="text-sm text-zinc-100 sm:text-base">
            Donut<span className="text-violet-400">Exchange</span>
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

        <div className="flex items-center gap-2">
          {session ? (
            <LogoutButton />
          ) : (
            <>
              <Link
                href="/login"
                className="focus-brand rounded-md px-3 py-1.5 text-sm text-zinc-300 transition hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="focus-brand rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500"
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
