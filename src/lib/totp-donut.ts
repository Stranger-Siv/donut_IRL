import { generateSecret, generateURI, verifySync } from "otplib";

const ISSUER = "Donut Exchange";

export function newTotpSecret(): string {
  return generateSecret();
}

export function buildOtpauthUrl(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  if (!secret || !code) return false;
  const t = String(code).replace(/\s/g, "");
  if (!/^\d{6,8}$/.test(t)) return false;
  return verifySync({ secret, token: t, epochTolerance: 30 }).valid;
}
