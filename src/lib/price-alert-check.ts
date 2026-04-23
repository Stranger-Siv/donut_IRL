import { connectDB } from "./mongodb";
import { User } from "@/models/User.model";
import { Notification } from "@/models/Notification.model";

export async function notifyPriceAlerts(
  itemSlug: string,
  newPrice: number
): Promise<void> {
  await connectDB();
  const users = await User.find({
    "priceAlerts.itemSlug": itemSlug,
    "priceAlerts.active": true,
  });

  for (const u of users) {
    for (const a of u.priceAlerts || []) {
      if (!a.active || a.itemSlug !== itemSlug) continue;
      if (newPrice >= a.targetPrice) {
        const title = "Price target hit";
        const message = `${itemSlug} is now ₹${newPrice} (target was ₹${a.targetPrice}).`;
        await Notification.create({ userId: u._id, type: "price", title, message });
        a.active = false;
      }
    }
    await u.save();
  }
}
