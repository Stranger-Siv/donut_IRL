"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
    >
      Log out
    </button>
  );
}
