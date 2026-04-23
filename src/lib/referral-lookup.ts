import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";

function formatReferrerDisplayName(u: {
  name?: string | null;
  email?: string | null;
}): string {
  const n = u.name?.trim();
  if (n) return n;
  const local = u.email?.split("@")?.[0];
  if (local) return local;
  return "A seller";
}

/** Returns a public display name for a valid referral code, or `null` if not found. */
export async function getReferrerNameByCode(code: string): Promise<string | null> {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  await connectDB();
  const u = await User.findOne({ referralCode: c }).select("name email").lean();
  if (!u) return null;
  return formatReferrerDisplayName(
    u as { name?: string | null; email?: string | null }
  );
}
