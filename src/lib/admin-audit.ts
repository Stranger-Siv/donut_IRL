import { connectDB } from "./mongodb";
import { AdminActivityLog } from "@/models/AdminActivityLog.model";
import { Types } from "mongoose";

export function getRequestIp(h: Headers) {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    ""
  );
}

export async function logAdminAction(
  adminId: string,
  action: string,
  opts?: { entityType?: string; entityId?: string; meta?: Record<string, unknown>; ip?: string }
) {
  try {
    await connectDB();
    await AdminActivityLog.create({
      adminId: new Types.ObjectId(adminId),
      action,
      entityType: opts?.entityType ?? "",
      entityId: opts?.entityId ?? "",
      ip: opts?.ip ?? "",
      meta: opts?.meta ?? {},
    });
  } catch {
    // non-fatal
  }
}
