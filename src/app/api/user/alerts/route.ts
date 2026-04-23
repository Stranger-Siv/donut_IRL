import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User.model";

const putSchema = z.object({
  itemSlug: z.string().min(1).max(40),
  targetPrice: z.number().min(0),
  active: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const u = await User.findById(s.id);
  if (!u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { itemSlug, targetPrice, active = true } = parsed.data;
  u.priceAlerts = (u.priceAlerts || []).filter(
    (a: { itemSlug: string }) => a.itemSlug !== itemSlug
  );
  u.priceAlerts.push({ itemSlug, targetPrice, active });
  await u.save();
  return NextResponse.json({ ok: true, priceAlerts: u.priceAlerts });
}

export async function DELETE(req: Request) {
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const itemSlug = searchParams.get("itemSlug");
  if (!itemSlug) {
    return NextResponse.json({ error: "itemSlug required" }, { status: 400 });
  }
  await connectDB();
  const u = await User.findById(s.id);
  if (!u) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  u.priceAlerts = (u.priceAlerts || []).filter(
    (a: { itemSlug: string }) => a.itemSlug !== itemSlug
  );
  await u.save();
  return NextResponse.json({ ok: true, priceAlerts: u.priceAlerts });
}
