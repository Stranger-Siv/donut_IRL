import { NextResponse } from "next/server";
import { getMaintenanceSnapshot } from "@/lib/maintenance.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public read; used by Edge middleware and optional clients. */
export async function GET() {
  const s = await getMaintenanceSnapshot();
  return NextResponse.json(
    { active: s.active, supportUrl: s.supportUrl || "" },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
