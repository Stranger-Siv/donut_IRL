import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { SiteContent } from "@/models/SiteContent.model";
import { logAdminAction, getRequestIp } from "@/lib/admin-audit";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

const patch = z
  .object({
    heroTitle: z.string().max(500).optional(),
    heroSubtitle: z.string().max(2000).optional(),
    announcementBar: z.string().max(2000).optional(),
    promoBanner: z.string().max(2000).optional(),
    faqMarkdown: z.string().max(50000).optional(),
    termsMarkdown: z.string().max(50000).optional(),
    footerLinks: z
      .array(z.object({ label: z.string().max(100), href: z.string().max(2000) }))
      .max(30)
      .optional(),
  })
  .strict();

export async function GET(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  let doc = await SiteContent.findById("global").lean();
  if (!doc) {
    await SiteContent.create({ _id: "global" });
    doc = (await SiteContent.findById("global").lean())!;
  }
  return NextResponse.json(doc);
}

export async function PATCH(req: Request) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const s = await getSessionUser();
  if (!s || s.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const p = patch.safeParse(await req.json());
  if (!p.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const doc = await SiteContent.findById("global");
  if (!doc) {
    await SiteContent.create({ _id: "global", ...p.data });
  } else {
    Object.assign(doc, p.data);
    await doc.save();
  }
  await logAdminAction(s.id, "content.update", { ip: getRequestIp(req.headers) });
  return NextResponse.json({ ok: true });
}
