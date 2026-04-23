import { LoginForm } from "./login-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (session) {
    const cb =
      typeof searchParams.callbackUrl === "string"
        ? searchParams.callbackUrl
        : "/dashboard";
    redirect(cb);
  }
  return (
    <div className="mx-auto w-full min-w-0 max-w-sm space-y-5 py-2 sm:space-y-6 sm:py-4">
      <h1 className="text-balance text-xl font-semibold text-zinc-50 sm:text-2xl">Log in</h1>
      <LoginForm />
    </div>
  );
}
