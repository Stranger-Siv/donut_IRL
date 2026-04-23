import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  getSessionUser: vi.fn().mockResolvedValue(null),
  requireUserMessage: vi.fn(),
  requireRole: vi.fn(),
}));

import { GET as userMeGET } from "@/app/api/user/me/route";
import { GET as adminStatsGET } from "@/app/api/admin/stats/route";
import { GET as ordersGET } from "@/app/api/orders/route";

describe("auth guards on API routes", () => {
  it("GET /api/user/me returns 401 when unauthenticated", async () => {
    const res = await userMeGET();
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/stats returns 403 when not admin", async () => {
    const res = await adminStatsGET();
    expect(res.status).toBe(403);
  });

  it("GET /api/orders returns 401 when unauthenticated", async () => {
    const res = await ordersGET();
    expect(res.status).toBe(401);
  });
});
