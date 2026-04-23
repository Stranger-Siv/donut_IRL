import { type DefaultSession } from "next-auth";

export type AppRole = "USER" | "STAFF" | "ADMIN";
export type AppSellerTier = "STANDARD" | "GOLD" | "DIAMOND";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      sellerTier: AppSellerTier;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    sellerTier: AppSellerTier;
  }
}
