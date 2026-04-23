import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-sm space-y-5 py-2 sm:space-y-6 sm:py-4">
      <h1 className="text-balance text-xl font-semibold text-zinc-50 sm:text-2xl">Set new password</h1>
      <ResetForm />
    </div>
  );
}
