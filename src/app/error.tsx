"use client";

/**
 * Custom route error UI avoids a Next 14 + Turbopack dev bug: when any render
 * throws, the framework default boundary calls `usePathname` and can crash
 * with "Invalid hook call" / useContext null. See `admin/fraud/page.tsx` note.
 */
import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-lg font-semibold text-zinc-100">Something went wrong</h1>
      <p className="mt-2 break-words text-sm text-zinc-500">
        {process.env.NODE_ENV === "development" ? error.message : "Please try again in a moment."}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="focus-brand rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Try again
        </button>
        <Link
          href="/"
          className="focus-brand rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
