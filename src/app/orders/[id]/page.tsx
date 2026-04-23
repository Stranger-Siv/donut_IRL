import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { OrderTrackClient } from "./order-track-client";

export const metadata = { title: "Order" };

export default async function OrderPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login?callbackUrl=/orders/${params.id}`);
  }
  return <OrderTrackClient id={params.id} />;
}
