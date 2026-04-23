import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { ReferralsClient } from "@/components/referrals/referrals-client";

export const metadata = { title: "Referrals" };

export default async function ReferralsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?callbackUrl=/referrals");
  }
  return <ReferralsClient />;
}
