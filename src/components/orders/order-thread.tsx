"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Send, Radio, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isLikelyImageAttachmentUrl } from "@/lib/order-message-attachments";
import type { OrderMessageResponse } from "@/lib/order-message-dto";
import type { OrderResponse } from "@/lib/order-response";

type ThreadProps = {
  orderId: string;
  currentUserId: string;
  canPost: boolean;
  /** Shown when `canPost` is false (e.g. completed order vs no permission). */
  readOnlyHint?: string;
  onOrderEvent?: (order: OrderResponse) => void;
};

type StreamPayload =
  | { type: "order"; order: OrderResponse }
  | { type: "message"; message: OrderMessageResponse }
  | { type: "ping"; t?: number };

const GROUP_MS = 5 * 60 * 1000;

function roleLabel(role: string) {
  if (role === "ADMIN") return "Admin";
  if (role === "STAFF") return "Middleman";
  return "Seller";
}

function initials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

function formatMsgTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Pull https URLs from one block of text; body is remainder (no double-box UX). */
function splitUrls(raw: string) {
  const s = raw.trim();
  const urlRe = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const found = s.match(urlRe) || [];
  const cleaned = found.map((u) => u.replace(/[.,;:)]+$/, "")).filter(Boolean);
  const unique = Array.from(new Set(cleaned)).slice(0, 5);
  let body = s;
  for (const u of found) {
    body = body.split(u).join(" ");
  }
  body = body.replace(/\s{2,}/g, " ").trim();
  return { body, attachmentUrls: unique };
}

export function OrderThread({
  orderId,
  currentUserId,
  canPost,
  readOnlyHint,
  onOrderEvent,
}: ThreadProps) {
  const [messages, setMessages] = useState<OrderMessageResponse[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [staged, setStaged] = useState<
    { id: string; file: File; previewUrl: string }[]
  >([]);
  const [live, setLive] = useState<"connecting" | "yes" | "no">("connecting");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onOrderEventRef = useRef(onOrderEvent);
  onOrderEventRef.current = onOrderEvent;

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}/messages`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const j = (await res.json()) as { messages: OrderMessageResponse[] };
    setMessages(j.messages || []);
  }, [orderId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const stagedRef = useRef(staged);
  stagedRef.current = staged;
  useEffect(() => {
    return () => {
      for (const s of stagedRef.current) {
        URL.revokeObjectURL(s.previewUrl);
      }
    };
  }, []);

  const showDateSeparator = (prev: OrderMessageResponse | null, m: OrderMessageResponse) => {
    if (!prev) return true;
    return (
      new Date(m.createdAt).toDateString() !== new Date(prev.createdAt).toDateString()
    );
  };

  const showGroupHeader = useCallback(
    (i: number) => {
      if (i === 0) return true;
      const m = messages[i];
      const prev = messages[i - 1];
      if (!m || !prev) return true;
      if (m.userId !== prev.userId) return true;
      return (
        new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() >
        GROUP_MS
      );
    },
    [messages]
  );

  const scrollToBottom = (smooth: boolean) => {
    if (typeof window === "undefined") return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
      return;
    }
    bottom.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  useEffect(() => {
    const path = `/api/orders/${orderId}/events`;
    const es = new EventSource(path, { withCredentials: true });

    const onData = (ev: MessageEvent) => {
      try {
        const p = JSON.parse(ev.data) as StreamPayload;
        if (p.type === "order") onOrderEventRef.current?.(p.order);
        else if (p.type === "message")
          setMessages((prev) => {
            if (prev.some((m) => m._id === p.message._id)) return prev;
            return [...prev, p.message];
          });
      } catch {
        /* */
      }
    };
    const onOpen = () => setLive("yes");
    const onErr = () => setLive("no");

    es.addEventListener("message", onData as (e: Event) => void);
    es.onopen = onOpen;
    es.onerror = onErr;
    if (es.readyState === 1) setLive("yes");

    const poll = setInterval(() => {
      void loadMessages();
      void fetch(`/api/orders/${orderId}`, { credentials: "include" })
        .then((r) => r.json())
        .then((o) => {
          if (o && o._id) onOrderEventRef.current?.(o as OrderResponse);
        })
        .catch(() => {
          /* */
        });
    }, 20_000);

    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [orderId, loadMessages]);

  const canSend = useMemo(() => {
    const { body, attachmentUrls } = splitUrls(draft);
    return body.length > 0 || attachmentUrls.length > 0 || staged.length > 0;
  }, [draft, staged.length]);

  function removeStaged(id: string) {
    setStaged((prev) => {
      const x = prev.find((p) => p.id === id);
      if (x) URL.revokeObjectURL(x.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function addImageFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const { attachmentUrls: fromText } = splitUrls(draft);
    const cap = 5;
    if (fromText.length + staged.length >= cap) {
      toast.error("Max 5 images or links per message (paste links in the text field).");
      return;
    }
    const toAdd: { id: string; file: File; previewUrl: string }[] = [];
    for (const file of Array.from(fileList)) {
      if (fromText.length + staged.length + toAdd.length >= cap) break;
      if (!file.type.startsWith("image/")) {
        toast.error(`Skipped ${file.name} — not an image.`);
        continue;
      }
      toAdd.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (toAdd.length) {
      setStaged((s) => [...s, ...toAdd].slice(0, cap - fromText.length));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadStaged(
    list: { id: string; file: File; previewUrl: string }[]
  ): Promise<string[]> {
    const out: string[] = [];
    for (const s of list) {
      const fd = new FormData();
      fd.append("file", s.file);
      const res = await fetch(`/api/orders/${orderId}/messages/upload`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error || "Upload failed");
      }
      const j = (await res.json()) as { url: string };
      if (j.url) out.push(j.url);
    }
    return out;
  }

  async function send() {
    if (!canSend) return;
    const { body, attachmentUrls: urlFromText } = splitUrls(draft);
    if (!body && urlFromText.length === 0 && staged.length === 0) return;
    if (urlFromText.length + staged.length > 5) {
      toast.error("Max 5 images or links per message.");
      return;
    }
    setSending(true);
    try {
      const uploaded = staged.length ? await uploadStaged(staged) : [];
      const seen = new Set<string>();
      const attachmentUrls: string[] = [];
      for (const u of [...urlFromText, ...uploaded]) {
        if (!seen.has(u)) {
          seen.add(u);
          attachmentUrls.push(u);
        }
      }
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body, attachmentUrls }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error || "Failed to send");
      }
      const j = (await res.json()) as { message: OrderMessageResponse };
      setMessages((prev) => {
        if (prev.some((m) => m._id === j.message._id)) return prev;
        return [...prev, j.message];
      });
      setDraft("");
      for (const s of staged) {
        URL.revokeObjectURL(s.previewUrl);
      }
      setStaged([]);
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      className="flex h-[min(32rem,65dvh)] min-h-[280px] max-h-[90dvh] flex-col overflow-hidden overscroll-y-contain rounded-2xl border border-violet-500/20 bg-zinc-950/60 shadow-lg shadow-violet-950/20"
      aria-label="Order conversation"
    >
      <div className="shrink-0 border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
            Messages
          </h2>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              live === "yes" && "bg-emerald-500/10 text-emerald-300",
              live === "no" && "bg-amber-500/10 text-amber-200/90",
              live === "connecting" && "bg-zinc-800 text-zinc-500"
            )}
            title={
              live === "no"
                ? "Reconnecting; thread still syncs in the background every 20s."
                : undefined
            }
          >
            {live === "yes" && <Radio className="size-3.5 text-emerald-400" aria-hidden />}
            {live === "no" && <WifiOff className="size-3.5 text-amber-300/80" aria-hidden />}
            {live === "connecting" && (
              <span className="size-1.5 animate-pulse rounded-full bg-zinc-500" />
            )}
            {live === "yes" && "Live"}
            {live === "no" && "Syncing…"}
            {live === "connecting" && "…"}
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
          Chat with your middleman. Use the image button to upload (JPEG, PNG, GIF, WebP, HEIC — max 5
          per message) or paste https:// links in the text box.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-y-contain px-3 py-3 [scrollbar-gutter:stable]"
        role="log"
        aria-relevant="additions"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm text-zinc-400">No messages yet</p>
            <p className="max-w-sm text-xs text-zinc-600">
              {canPost
                ? "Introduce yourself and share how you will complete the trade."
                : "When the buyer and middleman post, you will see the thread here."}
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const prev = i > 0 ? messages[i - 1]! : null;
          const mine = m.userId === currentUserId;
          const withDate = showDateSeparator(prev, m);
          const withHeader = showGroupHeader(i);

          return (
            <div key={m._id}>
              {withDate && (
                <div className="my-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <time
                    className="text-[10px] font-medium uppercase tracking-wide text-zinc-500"
                    dateTime={m.createdAt}
                  >
                    {new Date(m.createdAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              )}

              <div
                className={cn(
                  "flex gap-2",
                  mine ? "flex-row-reverse" : "flex-row"
                )}
              >
                {withHeader ? (
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 select-none items-center justify-center rounded-full text-[10px] font-semibold",
                      mine
                        ? "bg-violet-600/30 text-violet-200"
                        : "bg-zinc-800 text-zinc-300"
                    )}
                    aria-hidden
                  >
                    {initials(m.authorName)}
                  </div>
                ) : (
                  <div className="w-8 shrink-0" aria-hidden />
                )}

                <div
                  className={cn(
                    "min-w-0 max-w-[min(100%,24rem)]",
                    mine && "text-right"
                  )}
                >
                  {withHeader && !mine && (
                    <div className="mb-1 flex flex-wrap items-baseline justify-start gap-2 pl-0.5">
                      <span className="text-xs font-medium text-zinc-200">
                        {m.authorName}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                          m.authorRole === "ADMIN" &&
                            "bg-amber-500/15 text-amber-200/90",
                          m.authorRole === "STAFF" &&
                            "bg-cyan-500/15 text-cyan-200/90",
                          m.authorRole === "SELLER" &&
                            "bg-violet-500/15 text-violet-200/90"
                        )}
                      >
                        {roleLabel(m.authorRole)}
                      </span>
                    </div>
                  )}
                  {withHeader && mine && (
                    <div className="mb-1 pr-0.5 text-xs font-medium text-violet-200/80">
                      You
                    </div>
                  )}

                  <div
                    className={cn(
                      "inline-block w-full text-left",
                      mine && "text-right"
                    )}
                  >
                    <div
                      className={cn(
                        "inline-block max-w-full rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed shadow-sm",
                        mine
                          ? "rounded-tr-md bg-violet-600/35 text-zinc-50 ring-1 ring-violet-500/30"
                          : cn(
                              "rounded-tl-md border-l-[3px] bg-zinc-800/90 pl-3 text-zinc-100 ring-1 ring-white/5",
                              m.authorRole === "ADMIN" && "border-l-amber-500/80",
                              m.authorRole === "STAFF" && "border-l-cyan-500/80",
                              m.authorRole === "SELLER" && "border-l-violet-500/80"
                            )
                      )}
                    >
                      {m.body ? (
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      ) : null}
                      {m.attachmentUrls?.length > 0 && (
                        <ul
                          className={cn(
                            "mt-1.5 space-y-2",
                            m.body && "border-t border-white/5 pt-2.5"
                          )}
                        >
                          {m.attachmentUrls.map((u) => (
                            <li key={u}>
                              {isLikelyImageAttachmentUrl(u) ? (
                                <a
                                  href={u}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block overflow-hidden rounded-lg ring-1 ring-white/10"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={u}
                                    alt="Attachment"
                                    className="max-h-56 w-full object-contain"
                                    loading="lazy"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={u}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex break-all text-xs font-medium text-violet-300 underline decoration-violet-500/50 underline-offset-2 hover:text-violet-200"
                                >
                                  {u}
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <time
                      className={cn(
                        "mt-1 block text-[10px] tabular-nums text-zinc-500",
                        mine && "text-right"
                      )}
                      dateTime={m.createdAt}
                    >
                      {formatMsgTime(m.createdAt)}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {canPost ? (
        <div className="shrink-0 border-t border-white/5 bg-zinc-950/80 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              addImageFiles(e.target.files);
            }}
            aria-label="Add images"
          />
          {staged.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {staged.map((s) => (
                <div
                  key={s.id}
                  className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeStaged(s.id)}
                    className="absolute right-0.5 top-0.5 rounded bg-zinc-950/90 p-0.5 text-zinc-200 hover:text-white"
                    aria-label="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor={`order-chat-${orderId}`}>
              Message
            </label>
            <textarea
              id={`order-chat-${orderId}`}
              rows={2}
              className="min-h-[48px] flex-1 resize-y rounded-xl border border-white/10 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder="Type a message… (paste https:// links, or add images with +)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!sending && canSend) void send();
                }
              }}
            />
            <div className="flex shrink-0 flex-col justify-end gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-200 transition hover:border-violet-500/40 hover:bg-zinc-800 disabled:opacity-40"
                title="Add images"
                aria-label="Add images"
              >
                <ImagePlus className="size-4" />
              </button>
              <button
                type="button"
                disabled={sending || !canSend}
                onClick={() => void send()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                title="Send"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="shrink-0 border-t border-white/5 bg-zinc-950/50 px-4 py-3 text-center text-xs text-zinc-500">
          {readOnlyHint ??
            "You can read this thread but you cannot post on this order."}
        </p>
      )}
    </section>
  );
}
