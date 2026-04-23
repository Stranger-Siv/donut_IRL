import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getReferrerNameByCode } from "@/lib/referral-lookup";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create account" };

function refCodeFromParam(param: string | string[] | undefined): string {
  if (param == null) return "";
  const raw = Array.isArray(param) ? param[0] : param;
  return (raw || "").trim().toUpperCase();
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { ref?: string | string[] };
}) {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  const refFromQuery = refCodeFromParam(searchParams?.ref);
  let initialReferrerName: string | null = null;
  if (refFromQuery) {
    try {
      initialReferrerName = await getReferrerNameByCode(refFromQuery);
    } catch {
      initialReferrerName = null;
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-4">
      <h1 className="text-2xl font-semibold text-zinc-50">Create seller account</h1>
      <RegisterForm
        initialRefCode={refFromQuery || undefined}
        initialReferrerName={initialReferrerName}
      />
    </div>
  );
}
