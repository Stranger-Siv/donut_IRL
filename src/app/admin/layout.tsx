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
  return (
    <>
      {/*
        Critical admin layout: works even when /_next/static/css/* fails (stale .next, HMR).
        Without this, raw HTML shows every nav link at once and both mobile + desktop chrome.
      */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
[data-admin-desktop-nav]{display:none!important;flex-direction:column}
@media (min-width:1024px){
  [data-admin-desktop-nav]{display:flex!important;position:fixed;left:0;top:0;z-index:30;height:100dvh;width:16rem;max-width:100%}
}
[data-admin-mobile-header]{display:flex!important;align-items:center}
@media (min-width:1024px){
  [data-admin-mobile-header]{display:none!important}
  [data-admin-main-column]{padding-left:16rem}
}
[data-admin-main-column]{min-width:0;max-width:100%;box-sizing:border-box}
      `.trim(),
        }}
      />
      <AdminShell pathname={pathname}>
        <div className="min-w-0 max-w-full">{children}</div>
      </AdminShell>
    </>
  );
}
