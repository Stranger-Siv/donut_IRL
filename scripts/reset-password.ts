/**
 * Reset a user's password in MongoDB (e.g. locked-out admin, no email server yet).
 *
 *   npm run reset-password -- <email> <newPassword>
 *
 * Example (demo admin from seed):
 *   npm run reset-password -- admin@demo.local "password123"
 *
 * Uses MONGODB_URI from .env.local. Run only on a trusted machine; the password
 * appears in shell history unless you use a space-prefixed command (bash) or
 * type it another way.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../src/models/User.model";

async function main() {
  const [email, newPassword] = process.argv.slice(2).map((s) => s?.trim());
  if (!email || !newPassword) {
    console.error("Usage: npm run reset-password -- <email> <newPassword>");
    console.error("Example: npm run reset-password -- admin@demo.local \"NewPass123!\"");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters (same as registration).");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const u = await User.findOne({ email: email.toLowerCase() });
  if (!u) {
    console.error(`No user with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  u.passwordHash = await bcrypt.hash(newPassword, 12);
  await u.save();
  console.log(`Password updated for ${u.email} (role: ${u.role})`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
