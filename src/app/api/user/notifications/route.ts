import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { Notification } from "@/models/Notification.model";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const list = await Notification.find({ userId: new Types.ObjectId(s.id) })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  return NextResponse.json(
    list.map((n) => ({
      _id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
    }))
  );
}

export async function PATCH(req: Request) {
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await connectDB();
  if (id) {
    await Notification.updateOne(
      { _id: id, userId: new Types.ObjectId(s.id) },
      { $set: { read: true } }
    );
  } else {
    await Notification.updateMany(
      { userId: new Types.ObjectId(s.id) },
      { $set: { read: true } }
    );
  }
  return NextResponse.json({ ok: true });
}
