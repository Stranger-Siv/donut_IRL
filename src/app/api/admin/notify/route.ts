import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";
import { Notification } from "@/models/Notification.model";
import { logAdminAction, getRequestIp } from "@/lib/admin-audit";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

const body = z.object({
  audience: z.enum(["all", "vip", "inactive", "one"]),
  userId: z.string().optional(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  type: z
    .enum(["price", "promo", "referral", "maintenance", "info"])
    .default("info"),
});

export async function POST(req: Request) {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const p = body.safeParse(await req.json());
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const { audience, userId, title, message, type } = p.data;

  type IdRow = { _id: import("mongoose").Types.ObjectId };
  let userIds: IdRow[] = [];
  if (audience === "one") {
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const u = await User.findById(userId).select("_id").lean();
    if (!u) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    userIds = [u as IdRow];
  } else {
    const q: Record<string, unknown> = { role: "USER" };
    if (audience === "vip") q.isVip = true;
    if (audience === "inactive") {
      const since = subDays(new Date(), 30);
      q.$or = [
        { lastActiveAt: { $lt: since } },
        { lastActiveAt: { $exists: false } },
      ];
    }
    userIds = (await User.find(q).select("_id").limit(2000).lean()) as IdRow[];
  }

  const docs = userIds.map((u) => ({
    userId: u._id,
    type,
    title,
    message,
  }));
  if (docs.length) {
    await Notification.insertMany(docs);
  }
  await logAdminAction(s.id, "notify.broadcast", {
    meta: { count: docs.length, audience },
    ip: getRequestIp(req.headers),
  });
  return NextResponse.json({ ok: true, count: docs.length });
}
