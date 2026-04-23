import { Types } from "mongoose";
import { connectDB } from "./mongodb";
import { User } from "@/models/User.model";
import { Order } from "@/models/Order.model";
import { AppSettings } from "@/models/AppSettings.model";

type Mode = "MANUAL" | "ROUND_ROBIN" | "LOAD" | "SKILL";

function canHandleItem(
  skills: string[] | undefined,
  itemSlug: string
): boolean {
  const s = skills ?? [];
  if (s.length === 0) return true;
  if (s.includes("*")) return true;
  return s.map((x) => x.toLowerCase()).includes(itemSlug.toLowerCase());
}

const OPEN = ["PENDING", "ASSIGNED", "RECEIVED", "PAID", "HOLD", "REVIEW"] as const;

/**
 * Suggest next staff for `itemSlug` (does not write orders). Returns null if nothing fits or MANUAL.
 */
export async function suggestStaffForItem(itemSlug: string): Promise<{
  staffId: string;
  mode: Mode;
} | null> {
  await connectDB();
  const settings = await AppSettings.findById("global").lean();
  if (!settings) return null;
  const mode = (settings.assignmentMode as Mode) || "MANUAL";
  if (mode === "MANUAL") return null;

  const staff = await User.find({ role: "STAFF" })
    .select("_id assignmentSkills name")
    .lean()
    .sort({ _id: 1 });

  const admins = await User.find({ role: "ADMIN" })
    .select("_id assignmentSkills name")
    .lean()
    .sort({ _id: 1 });

  let pool = staff.filter((u) => canHandleItem(u.assignmentSkills as string[] | undefined, itemSlug));
  if (pool.length === 0 && mode === "SKILL" && (staff.length > 0 || admins.length > 0)) {
    return null;
  }
  if (pool.length === 0) {
    pool = [...staff, ...admins].filter((u) =>
      canHandleItem(u.assignmentSkills as string[] | undefined, itemSlug)
    );
  }
  if (pool.length === 0) {
    pool = staff.length > 0 ? staff : [...staff, ...admins];
  }
  if (pool.length === 0) return null;

  if (mode === "LOAD") {
    const scores = new Map<string, number>();
    for (const u of pool) scores.set(u._id.toString(), 0);
    const agg = await Order.aggregate<{ _id: Types.ObjectId; c: number }>([
      { $match: { status: { $in: OPEN as unknown as string[] }, assignedTo: { $exists: true, $ne: null } } },
      { $group: { _id: "$assignedTo", c: { $sum: 1 } } },
    ]);
    for (const row of agg) {
      const id = row._id.toString();
      if (scores.has(id)) scores.set(id, row.c);
    }
    let best = pool[0]!;
    let bestC = scores.get(best._id.toString()) ?? 0;
    for (const u of pool) {
      const c = scores.get(u._id.toString()) ?? 0;
      if (c < bestC) {
        bestC = c;
        best = u;
      }
    }
    return { staffId: best._id.toString(), mode };
  }

  if (mode === "ROUND_ROBIN") {
    const doc = await AppSettings.findById("global");
    const last = (doc?.lastRoundRobinStaffId as string) || "";
    const ids = pool.map((p) => p._id.toString());
    if (ids.length === 0) return null;
    const idx = last ? (ids.indexOf(last) + 1) % ids.length : 0;
    const pick = ids[idx] ?? ids[0];
    if (doc) {
      doc.lastRoundRobinStaffId = pick;
      await doc.save();
    }
    return { staffId: pick, mode };
  }

  // SKILL: same as round-robin among filtered pool, or if multiple — round robin
  const doc = await AppSettings.findById("global");
  const last = (doc?.lastRoundRobinStaffId as string) || "";
  const ids = pool.map((p) => p._id.toString());
  if (ids.length === 0) return null;
  const idx2 = last ? (ids.indexOf(last) + 1) % ids.length : 0;
  const pick2 = ids[idx2] ?? ids[0];
  if (doc) {
    doc.lastRoundRobinStaffId = pick2;
    await doc.save();
  }
  return { staffId: pick2, mode: "SKILL" };
}
