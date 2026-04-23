import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-zinc-950/50 py-6 text-center text-sm text-zinc-500 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-2 px-3 sm:px-6">
        <p className="text-balance text-xs leading-relaxed sm:text-sm">
          We buy 1M in-game money at listed rates. Not affiliated with any game studio.
        </p>
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
