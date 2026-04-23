import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-lg font-semibold text-zinc-100">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-500">
        That URL does not exist or was moved.
      </p>
      <Link
        href="/"
        className="focus-brand mt-6 inline-block rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
      >
        Home
      </Link>
    </div>
  );
}
