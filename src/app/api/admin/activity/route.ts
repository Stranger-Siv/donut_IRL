import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { AdminActivityLog } from "@/models/AdminActivityLog.model";
import { User } from "@/models/User.model";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const rows = await AdminActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  const adminIds = Array.from(new Set(rows.map((r) => r.adminId.toString())));
  const admins = await User.find({ _id: { $in: adminIds } }).select("email name").lean();
  const am = new Map(admins.map((a) => [a._id.toString(), a] as const));
  return NextResponse.json(
    rows.map((r) => ({
      _id: r._id.toString(),
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      adminEmail: am.get(r.adminId.toString())?.email,
      createdAt: r.createdAt,
      meta: r.meta,
    }))
  );
}
