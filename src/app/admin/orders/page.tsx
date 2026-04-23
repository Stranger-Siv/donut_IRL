import { Suspense } from "react";
import { AdminOrdersPage } from "@/components/admin/pages/admin-orders-page";

export const metadata = { title: "Admin · Orders" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
      <AdminOrdersPage />
    </Suspense>
  );
}
