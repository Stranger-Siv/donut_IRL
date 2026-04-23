import nextDynamic from "next/dynamic";

/**
 * Client-only: avoids a Next 14 + Turbopack dev bug where a failed RSC/SSR pass
 * triggers the framework ErrorBoundary, which calls `usePathname` without a
 * valid React context ("Invalid hook call" / useContext null).
 */
const AdminFraudPage = nextDynamic(
  () =>
    import("@/components/admin/pages/admin-fraud-page").then(
      (m) => m.AdminFraudPage
    ),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-zinc-500">Loading fraud dashboard…</p>
    ),
  }
);

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Fraud" };

export default function Page() {
  return <AdminFraudPage />;
}
