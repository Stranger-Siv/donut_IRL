import { z } from "zod";

/** Zod: external https URL or a path from our order-message upload API. */
export const attachmentUrlSchema = z
  .string()
  .max(2000)
  .refine(
    (s) => {
      if (s.includes("..")) return false;
      if (s.startsWith("/uploads/order-messages/")) {
        return /^\/uploads\/order-messages\/[a-f\d]{24}\/[^/[\]]+\.(jpe?g|png|gif|webp)$/i.test(
          s
        );
      }
      try {
        const u = new URL(s);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Invalid attachment URL" }
  );

export const maxAttachmentSizeBytes = 5 * 1024 * 1024; // 5MB

const imageMimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function extFromImageMime(mime: string): string | null {
  return imageMimeToExt[mime] ?? null;
}

export function isLikelyImageAttachmentUrl(u: string): boolean {
  if (u.startsWith("/uploads/order-messages/")) return true;
  try {
    const p = new URL(u).pathname;
    return /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(p);
  } catch {
    return /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(u);
  }
}
