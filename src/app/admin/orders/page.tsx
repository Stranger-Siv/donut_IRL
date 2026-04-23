import { Suspense } from "react";
import { AdminOrdersPage } from "@/components/admin/pages/admin-orders-page";
import { AdminTableSkeleton, Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Admin · Orders" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-w-0 max-w-full space-y-4">
          <Skeleton className="h-8 w-48 max-w-full" />
          <p className="text-xs text-zinc-500">Preparing order tools…</p>
          <AdminTableSkeleton rows={8} cols={6} />
        </div>
      }
    >
      <AdminOrdersPage />
    </Suspense>
  );
}
