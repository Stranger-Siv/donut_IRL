/**
 * Server-set codes for why a Referral is INELIGIBLE.
 * `ADMIN` may include a custom `ineligibleUserMessage` from support.
 */
export const INELIGIBLE_REASONS = {
  SAME_IP_AS_REFERRER: "SAME_IP_AS_REFERRER",
  SELF_REFERRAL: "SELF_REFERRAL",
  REFERRER_NOT_FOUND: "REFERRER_NOT_FOUND",
  ADMIN: "ADMIN",
} as const;

const DEFAULT_FALLBACK =
  "This referral is ineligible. Contact support if you have questions about your account.";

const REASON_TO_USER_TEXT: Record<string, string> = {
  [INELIGIBLE_REASONS.SAME_IP_AS_REFERRER]:
    "Anti-abuse: the invitee signed up from the same network or device as you, so this referral can’t accrue volume.",
  [INELIGIBLE_REASONS.SELF_REFERRAL]: "Self-referrals are not allowed.",
  [INELIGIBLE_REASONS.REFERRER_NOT_FOUND]:
    "The referrer account was no longer available when this referral was checked.",
  [INELIGIBLE_REASONS.ADMIN]:
    "This referral was marked ineligible by support. Contact us if you think this is a mistake.",
};

/**
 * Shown to referrers and invitees on the `/referrals` page when status is `INELIGIBLE`.
 * Custom `userMessage` (from support) takes precedence, then a known code, else a generic line.
 */
function normalizeStatus(st: string | undefined | null) {
  return String(st ?? "")
    .trim()
    .toUpperCase();
}

/**
 * @returns A user-facing string when the referral is ineligible, otherwise `null`.
 * Status is matched loosely (whitespace / case) so DB values still resolve.
 */
export function explainIneligibility(
  status: string,
  reasonCode: string | undefined,
  userMessage: string | undefined
): string | null {
  if (normalizeStatus(status) !== "INELIGIBLE") return null;
  const custom = (userMessage || "").trim();
  if (custom) return custom;
  const code = (reasonCode || "").trim();
  if (code && REASON_TO_USER_TEXT[code]) return REASON_TO_USER_TEXT[code];
  return DEFAULT_FALLBACK;
}

export const INELIGIBILITY_EXPLANATION_FALLBACK = DEFAULT_FALLBACK;

/**
 * Short label for admins (system vs admin, and which rule). Raw code in monospace if unknown.
 */
export function adminIneligibleSourceLabel(reasonCode: string | undefined): string {
  const c = (reasonCode || "").trim();
  if (!c) {
    return "Not recorded (legacy or before reason codes)";
  }
  const labels: Record<string, string> = {
    [INELIGIBLE_REASONS.SAME_IP_AS_REFERRER]:
      "System · invitee signup IP matched referrer’s last IP (anti-abuse)",
    [INELIGIBLE_REASONS.SELF_REFERRAL]: "System · self-referral not allowed",
    [INELIGIBLE_REASONS.REFERRER_NOT_FOUND]: "System · referrer user missing at order completion",
    [INELIGIBLE_REASONS.ADMIN]: "Admin · marked ineligible in admin panel",
  };
  if (labels[c]) return labels[c];
  return `Unknown code: ${c}`;
}
