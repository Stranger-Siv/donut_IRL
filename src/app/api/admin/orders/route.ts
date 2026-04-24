import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order.model";
import { User } from "@/models/User.model";
import { Types } from "mongoose";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

const LIMIT = 500;

function buildQuery(sp: URLSearchParams) {
  const q: Record<string, unknown> = {};
  const st = sp.get("status");
  if (st && st !== "all") q.status = st;
  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) {
    const range: { $gte?: Date; $lte?: Date } = {};
    if (from) range.$gte = new Date(from);
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      range.$lte = t;
    }
    q.createdAt = range;
  }
  const itemType = sp.get("itemType");
  if (itemType && itemType !== "all") q.itemType = itemType;
  const staffId = sp.get("staffId");
  if (staffId && staffId !== "all") {
    try {
      q.assignedTo = new Types.ObjectId(staffId);
    } catch {
      /* invalid */
    }
  }
  if (sp.get("highValue") === "1") {
    const m = sp.get("minInr");
    const min = m ? Math.max(0, parseFloat(m)) : 5000;
    q.payoutAmount = { $gte: min };
  }
  const userId = sp.get("user");
  if (userId) {
    try {
      q.userId = new Types.ObjectId(userId);
    } catch {
      /* skip */
    }
  }
  return q;
}

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const q = buildQuery(searchParams);
  await connectDB();
  const all = await Order.find(q)
    .sort({ createdAt: -1 })
    .limit(LIMIT)
    .lean();

  const uids = Array.from(new Set(all.map((o) => o.userId.toString())));
  const users = await User.find({ _id: { $in: uids } })
    .select("name email")
    .lean();
  const uMap = new Map(users.map((u) => [u._id.toString(), u] as const));
  const staffIds = all
    .map((o) => o.assignedTo?.toString())
    .filter((x): x is string => !!x);
  const staff = staffIds.length
    ? await User.find({ _id: { $in: Array.from(new Set(staffIds)) } })
        .select("name email")
        .lean()
    : [];
  const sMap = new Map(staff.map((u) => [u._id.toString(), u] as const));

  return NextResponse.json(
    all.map((o) => ({
      _id: o._id.toString(),
      userId: o.userId.toString(),
      userEmail: uMap.get(o.userId.toString())?.email ?? "—",
      userName: uMap.get(o.userId.toString())?.name ?? "—",
      itemName: o.itemName,
      itemSlug: o.itemSlug,
      itemType: o.itemType,
      quantity: o.quantity,
      payoutAmount: o.payoutAmount,
      payoutMethod: o.payoutMethod,
      status: o.status,
      createdAt: o.createdAt,
      assignedTo: o.assignedTo?.toString() ?? null,
      assignedName: o.assignedTo
        ? sMap.get(o.assignedTo.toString())?.name ?? "—"
        : null,
      payoutReference: o.payoutReference ?? "",
    }))
  );
}
