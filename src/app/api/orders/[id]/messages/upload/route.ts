import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { Order } from "@/models/Order.model";
import { canReadOrder, canPostOrderMessage } from "@/lib/order-guards";
import {
  extFromImageMime,
  maxAttachmentSizeBytes,
} from "@/lib/order-message-attachments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isObjectId24(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  if (!isObjectId24(orderId)) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const f = file as File;
  const ab = await f.arrayBuffer();
  if (ab.byteLength === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (ab.byteLength > maxAttachmentSizeBytes) {
    return NextResponse.json(
      { error: `Image must be at most ${maxAttachmentSizeBytes / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  const ext = extFromImageMime(f.type);
  if (!ext) {
    return NextResponse.json(
      { error: "Use JPEG, PNG, GIF, or WebP" },
      { status: 400 }
    );
  }

  await connectDB();
  const o = await Order.findById(orderId);
  if (!o) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canReadOrder(o, s.id, s.role) || !canPostOrderMessage(o, s.id, s.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  const relDir = path.join("public", "uploads", "order-messages", orderId);
  const absDir = path.join(process.cwd(), relDir);
  await mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, name);
  await writeFile(absPath, Buffer.from(ab));

  const publicPath = `/uploads/order-messages/${orderId}/${name}`;
  return NextResponse.json({ url: publicPath, size: ab.byteLength });
}
