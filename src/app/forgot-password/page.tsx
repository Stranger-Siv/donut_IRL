import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-4">
      <h1 className="text-2xl font-semibold text-zinc-50">Forgot password</h1>
      <ForgotForm />
    </div>
  );
}
