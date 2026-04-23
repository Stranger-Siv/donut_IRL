import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { NextResponse } from "next/server";
import type { AppRole } from "@/types/next-auth";

export async function getSessionUser() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) return null;
  return { ...s.user, id: s.user.id };
}

export function requireUserMessage() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function requireRole(roles: AppRole[]) {
  return async function () {
    const u = await getSessionUser();
    if (!u) return { error: requireUserMessage(), user: null as null };
    if (!roles.includes(u.role as AppRole)) {
      return {
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        user: null as null,
      };
    }
    return { error: null, user: u };
  };
}
