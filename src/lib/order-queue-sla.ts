import type { OrderStatus } from "@/models/Order.model";
import { Order } from "@/models/Order.model";
import type { Types } from "mongoose";

const QUEUE_STATUSES: OrderStatus[] = [
  "PENDING",
  "ASSIGNED",
  "RECEIVED",
  "PAID",
  "HOLD",
  "REVIEW",
];

export function isActiveQueueStatus(st: string): boolean {
  return QUEUE_STATUSES.includes(st as OrderStatus);
}

export type BusinessSettings = {
  timezone: string;
  businessDayStart: string;
  businessDayEnd: string;
  businessDays: string;
  defaultSlaHours: number;
};

export function toBusinessBlock(doc: {
  timezone?: string;
  businessDayStart?: string;
  businessDayEnd?: string;
  businessDays?: string;
  defaultSlaHours?: number;
}): BusinessSettings {
  return {
    timezone: doc.timezone || "Asia/Kolkata",
    businessDayStart: doc.businessDayStart || "10:00",
    businessDayEnd: doc.businessDayEnd || "22:00",
    businessDays: doc.businessDays || "1,2,3,4,5",
    defaultSlaHours: doc.defaultSlaHours ?? 24,
  };
}

function parseHm(s: string): { h: number; m: number } {
  const [a, b] = s.split(":").map((x) => parseInt(x, 10));
  return { h: Number.isFinite(a) ? a : 10, m: Number.isFinite(b) ? b : 0 };
}

function minutesFromMidnight(h: number, m: number) {
  return h * 60 + m;
}

/** Parse "1,2,3,4,5" as set of JS getDay() values (0 Sun .. 6 Sat). */
function parseBusinessDays(s: string): Set<number> {
  const set = new Set<number>();
  for (const p of s.split(/[,\s]+/).map((x) => x.trim())) {
    const n = parseInt(p, 10);
    if (n >= 0 && n <= 6) set.add(n);
  }
  if (set.size === 0) {
    [1, 2, 3, 4, 5].forEach((d) => set.add(d));
  }
  return set;
}

/**
 * Whether "now" falls inside configured business hours in `timeZone`.
 * Uses wall-clock hour/minute in that zone.
 */
export function isWithinBusinessHours(settings: BusinessSettings, at = new Date()): boolean {
  const days = parseBusinessDays(settings.businessDays);
  const tz = settings.timezone || "Asia/Kolkata";
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(at);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const d = dayMap[wd] ?? 0;
  if (!days.has(d)) return false;

  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
  const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
  const nowM = minutesFromMidnight(hh || 0, mm || 0);
  const start = parseHm(settings.businessDayStart || "10:00");
  const end = parseHm(settings.businessDayEnd || "22:00");
  const startM = minutesFromMidnight(start.h, start.m);
  const endM = minutesFromMidnight(end.h, end.m);
  return nowM >= startM && nowM <= endM;
}

export function businessHoursSummary(settings: BusinessSettings): string {
  return `${settings.businessDayStart}–${settings.businessDayEnd} (${settings.timezone}, business days ${settings.businessDays})`;
}

export function estimateProcessingCopy(
  settings: BusinessSettings,
  queuePosition: number | null,
  open: boolean
): string {
  const sla = Math.max(1, settings.defaultSlaHours ?? 24);
  const pos = queuePosition != null && queuePosition > 0 ? `Queue position: ~${queuePosition}. ` : "";
  const hours = `Typical processing target: within about ${sla} business hours once assigned.`;
  if (!open) {
    return `${pos}We are currently outside posted business hours (${businessHoursSummary(settings)}). ${hours}`;
  }
  return `${pos}${hours}`;
}

/**
 * Position among all non-terminal work queue orders (oldest = 1). Null if this order is not in the queue.
 */
export async function getQueuePositionForOrder(order: {
  _id: Types.ObjectId;
  createdAt: Date;
  status: string;
}): Promise<number | null> {
  if (!isActiveQueueStatus(order.status)) return null;
  const n = await Order.countDocuments({
    status: { $in: QUEUE_STATUSES },
    $or: [
      { createdAt: { $lt: order.createdAt } },
      { createdAt: order.createdAt, _id: { $lt: order._id } },
    ],
  });
  return n + 1;
}
