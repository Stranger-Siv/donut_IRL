import { AdminShell } from "@/components/admin/admin-shell";
import { getRequestPathname } from "@/components/layout/conditional-chrome";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }
  const pathname = getRequestPathname();
  return <AdminShell pathname={pathname}>{children}</AdminShell>;
}
