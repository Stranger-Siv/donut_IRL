import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { OrderTrackClient } from "@/app/orders/[id]/order-track-client";

export const metadata = { title: "Admin · Order" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login?callbackUrl=/admin/orders/${params.id}`);
  }
  if (session.user.role !== "ADMIN") {
    redirect(`/orders/${params.id}`);
  }
  return (
    <OrderTrackClient
      id={params.id}
      backHref="/admin/orders"
      backLabel="Back to orders"
    />
  );
}
