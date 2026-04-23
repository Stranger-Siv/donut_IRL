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
    <div className="mx-auto max-w-sm space-y-6 py-4">
      <h1 className="text-2xl font-semibold text-zinc-50">Log in</h1>
      <LoginForm />
    </div>
  );
}
