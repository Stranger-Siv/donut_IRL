/**
 * Seed MongoDB with demo data. Run: npm run seed
 * Requires MONGODB_URI in .env.local
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../src/models/User.model";
import { Price } from "../src/models/Price.model";
import { Order } from "../src/models/Order.model";
import { RateSettings } from "../src/models/RateSettings.model";
import { generateReferralCode } from "../src/lib/utils";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Connected");

  await User.deleteMany({
    email: { $in: ["admin@demo.local", "staff@demo.local", "seller@demo.local"] },
  });
  await Price.deleteMany({});
  await Order.deleteMany({});
  await RateSettings.deleteMany({ _id: "global" });

  const pw = await bcrypt.hash("password123", 12);

  await RateSettings.create({
    _id: "global",
    standardRate: 1.8,
    goldRate: 1.9,
    diamondRate: 2.0,
  });

  await User.create({
    name: "Admin",
    email: "admin@demo.local",
    passwordHash: pw,
    role: "ADMIN",
    sellerTier: "DIAMOND",
    lifetimeVolumeSold: 0,
    referralCode: generateReferralCode(),
  });

  const staff = await User.create({
    name: "Staff",
    email: "staff@demo.local",
    passwordHash: pw,
    role: "STAFF",
    sellerTier: "GOLD",
    lifetimeVolumeSold: 0,
    referralCode: generateReferralCode(),
  });

  const seller = await User.create({
    name: "Demo Seller",
    email: "seller@demo.local",
    passwordHash: pw,
    role: "USER",
    sellerTier: "STANDARD",
    lifetimeVolumeSold: 309,
    referralCode: generateReferralCode(),
    totalSoldInr: 980,
    firstSellCompleted: true,
  });

  const p1 = await Price.create({
    itemName: "1M Gold",
    itemSlug: "1m",
    unitLabel: "per 1M",
    currentPrice: 1.8,
    kind: "CURRENCY",
    equivalentMPerUnit: 1,
    sortOrder: 1,
  });

  const completed1 = await Order.create({
    userId: seller._id,
    itemName: p1.itemName,
    itemSlug: p1.itemSlug,
    itemType: "CURRENCY",
    quantity: 300,
    equivalentVolume: 300,
    unitPrice: 1.8,
    basePayoutInr: 540,
    tierBonusInr: 0,
    payoutAmount: 540,
    sellerTierAtOrder: "STANDARD",
    payoutMethod: "UPI",
    payoutDetails: "demo@upi",
    status: "COMPLETED",
    publicSummary: "300M sold • ₹540 paid",
    completedAt: new Date(),
  });

  await Order.create({
    userId: seller._id,
    itemName: p1.itemName,
    itemSlug: p1.itemSlug,
    itemType: "CURRENCY",
    quantity: 50,
    equivalentVolume: 50,
    unitPrice: 1.8,
    basePayoutInr: 90,
    tierBonusInr: 0,
    payoutAmount: 90,
    sellerTierAtOrder: "STANDARD",
    payoutMethod: "UPI",
    payoutDetails: "pending@upi",
    status: "ASSIGNED",
    assignedTo: staff._id,
  });

  await Order.create({
    userId: seller._id,
    itemName: p1.itemName,
    itemSlug: p1.itemSlug,
    itemType: "CURRENCY",
    quantity: 5,
    equivalentVolume: 5,
    unitPrice: 1.8,
    basePayoutInr: 9,
    tierBonusInr: 0,
    payoutAmount: 9,
    sellerTierAtOrder: "STANDARD",
    payoutMethod: "UPI",
    payoutDetails: "queue@upi",
    status: "PENDING",
  });

  console.log("Seed: tier M rates 1.8 / 1.9 / 2.0 · seller@demo.local / password123");
  console.log("Sample order:", completed1._id.toString());

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
