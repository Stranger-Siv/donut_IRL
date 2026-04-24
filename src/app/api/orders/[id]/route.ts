import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/api-auth";
import { canReadOrder } from "@/lib/order-guards";
import { orderChannelPub } from "@/lib/order-channel";
import { toOrderResponse } from "@/lib/order-response";
import { Order } from "@/models/Order.model";
import { onOrderCompleted } from "@/lib/referral-logic";
import { buildPublicFeedLine } from "@/lib/order-public";
import { recordCompletedOrder } from "@/lib/analytics-helpers";
import { sendDiscordEvent } from "@/lib/discord";
import type { OrderStatus } from "@/models/Order.model";
import { Types } from "mongoose";
import { tryAutoCancelIfExpired } from "@/lib/order-expire";
import { getOrCreateAppSettings } from "@/lib/app-settings.server";
import {
  getQueuePositionForOrder,
  estimateProcessingCopy,
  isWithinBusinessHours,
  toBusinessBlock,
} from "@/lib/order-queue-sla";
import { maintenanceResponseIfBlocked } from "@/lib/maintenance-api-guard.server";

export const dynamic = "force-dynamic";

const STATUS_ENUM = z.enum([
  "PENDING",
  "ASSIGNED",
  "RECEIVED",
  "PAID",
  "COMPLETED",
  "CANCELLED",
  "HOLD",
  "REVIEW",
]);

const patchSchema = z.object({
  status: STATUS_ENUM.optional(),
  assignedTo: z.string().nullable().optional(),
  staffNote: z.string().max(5000).optional(),
  adminNote: z.string().max(5000).optional(),
  publicStaffNote: z.string().max(5000).optional(),
  payoutReference: z.string().max(500).optional(),
  cancel: z.boolean().optional(),
  /** Partial line — admin only */
  fulfilledQuantity: z.number().min(0).optional(),
  payoutAmount: z.number().min(0).optional(),
  equivalentVolume: z.number().min(0).optional(),
  addEvidenceUrl: z.string().url().max(2000).optional(),
});

function publishOrderUpdate(orderId: string, o: InstanceType<typeof Order>) {
  orderChannelPub(orderId, { type: "order", order: toOrderResponse(o) });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const __m = await maintenanceResponseIfBlocked(_req);
  if (__m) return __m;
  const { id } = await params;
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const o = await Order.findById(id);
  if (!o) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canReadOrder(o, s.id, s.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await tryAutoCancelIfExpired(o);
  const base = toOrderResponse(o);
  const settings = await getOrCreateAppSettings();
  const b = toBusinessBlock(settings);
  const queuePosition =
    o.status === "PENDING"
      ? await getQueuePositionForOrder({
          _id: o._id,
          createdAt: o.createdAt!,
          status: o.status,
        })
      : null;
  const isBusinessOpen = isWithinBusinessHours(b);
  return NextResponse.json({
    ...base,
    queuePosition,
    isBusinessOpen,
    processingHint: estimateProcessingCopy(b, queuePosition, isBusinessOpen),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const __m = await maintenanceResponseIfBlocked(req);
  if (__m) return __m;
  const { id } = await params;
  const s = await getSessionUser();
  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const o = await Order.findById(id);
  if (!o) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const {
    status,
    assignedTo,
    staffNote,
    adminNote,
    publicStaffNote,
    payoutReference,
    cancel,
    fulfilledQuantity,
    payoutAmount,
    equivalentVolume,
    addEvidenceUrl,
  } = parsed.data;
  const isAdmin = s.role === "ADMIN";
  const isStaff =
    s.role === "STAFF" &&
    o.assignedTo &&
    o.assignedTo.toString() === s.id;
  const isOwner = o.userId.toString() === s.id;

  if (cancel && isOwner && o.status === "PENDING") {
    o.status = "CANCELLED";
    await o.save();
    publishOrderUpdate(id, o);
    return NextResponse.json({ ok: true, status: o.status });
  }

  if (isStaff && !isAdmin) {
    if (staffNote !== undefined) o.staffNote = staffNote;
    if (status === "RECEIVED") {
      o.status = "RECEIVED";
      o.receivedAt = new Date();
    }
    if (status === "ASSIGNED") {
      // staff should not reassign; ignore
    }
    await o.save();
    publishOrderUpdate(id, o);
    return NextResponse.json({ ok: true, status: o.status });
  }

  if (!isAdmin) {
    if (isOwner && o.status === "PENDING" && cancel) {
      o.status = "CANCELLED";
      await o.save();
      publishOrderUpdate(id, o);
      return NextResponse.json({ ok: true, status: o.status });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (adminNote !== undefined) o.adminNote = adminNote;
  if (staffNote !== undefined) o.staffNote = staffNote;
  if (publicStaffNote !== undefined) o.publicStaffNote = publicStaffNote;
  if (payoutReference !== undefined) o.payoutReference = payoutReference;
  if (fulfilledQuantity !== undefined) {
    if (fulfilledQuantity > o.quantity) {
      return NextResponse.json({ error: "fulfilledQuantity cannot exceed quantity" }, { status: 400 });
    }
    o.fulfilledQuantity = fulfilledQuantity;
  }
  if (payoutAmount !== undefined) o.payoutAmount = payoutAmount;
  if (equivalentVolume !== undefined) o.equivalentVolume = equivalentVolume;
  if (addEvidenceUrl) {
    const list = [...(o.evidenceUrls ?? [])];
    if (list.length >= 5) {
      return NextResponse.json({ error: "Maximum 5 evidence files" }, { status: 400 });
    }
    o.evidenceUrls = [...list, addEvidenceUrl];
  }
  if (assignedTo !== undefined) {
    o.assignedTo = assignedTo
      ? new Types.ObjectId(assignedTo)
      : null;
  }

  if (status) {
    const prev: OrderStatus = o.status;
    o.status = status as OrderStatus;
    if (status === "ASSIGNED" && assignedTo) {
      o.assignedTo = new Types.ObjectId(assignedTo);
    }
    if (status === "ASSIGNED" || assignedTo) {
      o.autoCancelAt = null;
    }
    if (status === "RECEIVED") o.receivedAt = new Date();
    if (status === "PAID") o.paidAt = new Date();
    if (status === "HOLD" || status === "REVIEW") o.holdAt = new Date();
    if (status === "COMPLETED") {
      o.completedAt = new Date();
      const fq = (o as { fulfilledQuantity?: number | null }).fulfilledQuantity;
      const qLine = typeof fq === "number" ? fq : o.quantity;
      o.publicSummary = buildPublicFeedLine(
        o.itemSlug,
        o.itemName,
        qLine,
        o.payoutAmount
      );
      if (prev !== "COMPLETED") {
        const ms =
          o.completedAt.getTime() - o.createdAt!.getTime();
        const min = Math.max(0, Math.round(ms / 60000));
        const revenue = Math.round(o.payoutAmount * 0.1 * 100) / 100;
        await recordCompletedOrder(
          o.completedAt!,
          o.payoutAmount,
          revenue,
          min
        );
        await onOrderCompleted(
          o.userId.toString(),
          o.payoutAmount,
          o.equivalentVolume || 0
        );
        void sendDiscordEvent({
          type: "trade",
          body: o.publicSummary!,
        });
      }
    }
  }

  await o.save();
  publishOrderUpdate(id, o);
  return NextResponse.json({ ok: true, status: o.status });
}
