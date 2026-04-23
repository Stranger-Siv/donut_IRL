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
    <div className="mx-auto max-w-sm space-y-6 py-4">
      <h1 className="text-2xl font-semibold text-zinc-50">Set new password</h1>
      <ResetForm />
    </div>
  );
}
