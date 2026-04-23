import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-zinc-950/50 py-8 text-center text-sm text-zinc-500">
      <div className="mx-auto max-w-6xl space-y-2 px-4">
        <p>We buy 1M in-game money at listed rates. Not affiliated with any game studio.</p>
        <p className="text-xs text-zinc-600">
          <Link href="/login" className="hover:text-zinc-400">
            Log in
          </Link>
          <span className="mx-2">·</span>
          <Link href="/register" className="hover:text-zinc-400">
            Create account
          </Link>
        </p>
      </div>
    </footer>
  );
}
