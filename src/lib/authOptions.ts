import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import { User } from "@/models/User.model";
import type { AppRole, AppSellerTier } from "@/types/next-auth";
import { isMongoConnectionError } from "./db-errors";
import { higherSellerTier, normalizeSellerTier, sellerTierFromVolumeM } from "./tier";
import { verifyTotpCode } from "./totp-donut";

/**
 * One stable secret for signing/encrypting JWT sessions. In production it must be set in
 * the host environment (e.g. `openssl rand -base64 32`) and kept the same on every instance
 * and every deploy, or you get JWT_SESSION_ERROR / "decryption operation failed".
 * After rotating the secret, users with old cookies must sign in again (or clear site data).
 */
function getNextAuthSecret(): string {
  if (process.env.NODE_ENV === "production") {
    const s = process.env.NEXTAUTH_SECRET;
    if (!s || s.length < 32) {
      throw new Error(
        "NEXTAUTH_SECRET is required in production: set a stable random value of at least 32 characters in your host (e.g. openssl rand -base64 32). " +
          "It must be identical for every deploy and every replica. If the secret changed, existing session cookies will fail to decrypt (JWT_SESSION_ERROR) until users sign in again."
      );
    }
    return s;
  }
  return process.env.NEXTAUTH_SECRET || "dev-only-nextauth-secret-do-not-use-in-production-32bytes-min";
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        code: { label: "2FA", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          await connectDB();
          const u = await User.findOne({ email: credentials.email.toLowerCase().trim() }).select(
            "+passwordHash +totpSecret"
          );
          if (!u) return null;
          if (u.banned) return null;
          const ok = await bcrypt.compare(credentials.password, u.passwordHash);
          if (!ok) return null;
          if (u.role === "ADMIN" && (u as { totpEnabled?: boolean }).totpEnabled) {
            const code = (credentials as { code?: string }).code?.trim() ?? "";
            const sec = (u as { totpSecret?: string }).totpSecret ?? "";
            if (!verifyTotpCode(sec, code)) {
              return null;
            }
          }
          u.lastActiveAt = new Date();
          const stored = normalizeSellerTier(u.sellerTier as string | undefined);
          const fromVol = sellerTierFromVolumeM(u.lifetimeVolumeSold || 0);
          const sellerTier = higherSellerTier(stored, fromVol) as AppSellerTier;
          if (sellerTier !== stored) {
            u.sellerTier = sellerTier;
          }
          await u.save();
          return {
            id: u._id.toString(),
            email: u.email!,
            name: u.name!,
            role: u.role as AppRole,
            sellerTier,
          };
        } catch (e) {
          if (isMongoConnectionError(e) && process.env.NODE_ENV === "development") {
            console.warn(
              "[Donut] Login: MongoDB not reachable. Run: docker compose up -d  (or fix MONGODB_URI)\n"
            );
          } else {
            console.error(e);
          }
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          role: AppRole;
          sellerTier: AppSellerTier;
        };
        token.id = u.id;
        token.role = u.role;
        token.sellerTier = u.sellerTier;
        token.name = user.name;
        token.email = user.email;
      }
      if (trigger === "update" && session?.sellerTier) {
        token.sellerTier = session.sellerTier as AppSellerTier;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AppRole;
        session.user.sellerTier = token.sellerTier as AppSellerTier;
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: getNextAuthSecret(),
};
