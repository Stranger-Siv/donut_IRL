import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { WalletPageClient } from "./wallet-page-client";

export const metadata = { title: "Wallet" };

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?callbackUrl=/wallet");
  }
  if (session.user.role !== "USER") {
    redirect("/dashboard");
  }
  return <WalletPageClient />;
}
