import { describe, it, expect, vi } from "vitest";

/* Public / validation-only routes (no auth) */
import { GET as referralsResolveGET } from "@/app/api/referrals/resolve/route";
import { POST as forgotPasswordPOST } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordPOST } from "@/app/api/auth/reset-password/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { GET as pricesGET } from "@/app/api/prices/route";

vi.mock("@/lib/mail", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/referrals/resolve", () => {
  it("returns 400 when code is missing", async () => {
    const res = await referralsResolveGET(
      new Request("http://localhost/api/referrals/resolve")
    );
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error?: string };
    expect(j.error).toBeDefined();
  });

  it("returns 400 when code is empty", async () => {
    const res = await referralsResolveGET(
      new Request("http://localhost/api/referrals/resolve?code=")
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 for invalid JSON body", async () => {
    const res = await forgotPasswordPOST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await forgotPasswordPOST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/reset-password", () => {
  it("returns 400 when password too short", async () => {
    const res = await resetPasswordPOST(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "abc", password: "short" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid token when DB available", async () => {
    const res = await resetPasswordPOST(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "deadbeef".repeat(8),
          password: "password123",
        }),
      })
    );
    if (!process.env.MONGODB_URI) {
      expect([400, 503]).toContain(res.status);
      return;
    }
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error?: string };
    expect(String(j.error || "")).toMatch(/invalid|expired/i);
  });
});

describe("POST /api/auth/register", () => {
  it("returns 400 for invalid payload", async () => {
    const res = await registerPOST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "A", email: "bad", password: "x" }),
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/prices", () => {
  it("returns JSON with tierRates and items array", async () => {
    const res = await pricesGET();
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      tierRates: { STANDARD: number; GOLD: number; DIAMOND: number };
      items: unknown[];
      minSellQuantityM: number;
    };
    expect(j.tierRates).toBeDefined();
    expect(j.tierRates.STANDARD).toBeGreaterThan(0);
    expect(Array.isArray(j.items)).toBe(true);
    expect(typeof j.minSellQuantityM).toBe("number");
  });
});

