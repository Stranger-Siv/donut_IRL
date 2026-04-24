import { OrderTrackClient } from "./order-track-client";

export const metadata = { title: "Order" };

export default async function OrderPage({
  params,
}: {
  params: { id: string };
}) {
  return <OrderTrackClient id={params.id} />;
}
