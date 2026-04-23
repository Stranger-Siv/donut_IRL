"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, TableShell } from "../ui";

type Row = {
  _id: string;
  action: string;
  adminEmail?: string;
  createdAt: string;
  entityType: string;
  entityId: string;
};

type TwoFaStatus = { totpEnabled: boolean; hasSecret: boolean };

export function AdminSecurityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [s2, setS2] = useState<TwoFaStatus | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/activity");
    if (r.ok) setRows((await r.json()) as Row[]);
    const t = await fetch("/api/admin/auth-2fa");
    if (t.ok) setS2((await t.json()) as TwoFaStatus);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function post2fa(action: "setup" | "enable" | "disable", extra?: object) {
    const r = await fetch("/api/admin/auth-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string; otpauthUrl?: string; secret?: string; ok?: boolean };
    if (!r.ok) {
      toast.error(j.error || "Request failed");
      return j;
    }
    return j;
  }

  return (
    <div>
      <AdminPageHeader
        title="Admin security and audit"
        desc="TOTP (Google Authenticator) for admin sign-in, plus the audit log below."
      />

      <div className="mb-8 max-w-lg space-y-4 rounded-xl border border-white/10 bg-zinc-950/50 p-4 text-sm text-zinc-300">
        <h2 className="font-medium text-zinc-100">Two-factor (TOTP / Google Authenticator)</h2>
        <p className="text-xs text-zinc-500">
          After you enable 2FA, the login page will require a 6-digit code for this account. Add the secret to Google
          Authenticator (or any TOTP app), then confirm. Keep backup codes in a safe place; disabling requires
          password + a valid code.
        </p>
        {s2 && (
          <p className="text-xs text-zinc-400">
            Status: {s2.totpEnabled ? "Enabled" : s2.hasSecret ? "Not confirmed (add app + enable)" : "Not set up"}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs"
            onClick={async () => {
              setSetupUrl(null);
              setSetupSecret(null);
              const j = await post2fa("setup");
              if (j?.otpauthUrl) {
                setSetupUrl(j.otpauthUrl);
                if (j.secret) setSetupSecret(String(j.secret));
                toast.message("Scan the QR in your app, then enter a code to enable.");
                void load();
              }
            }}
            disabled={s2?.totpEnabled === true}
          >
            {s2?.hasSecret && !s2.totpEnabled ? "Regenerate setup (optional)" : "Start setup (new secret)"}
          </button>
        </div>
        {setupUrl && (
          <div className="space-y-2 rounded border border-amber-500/20 bg-amber-950/20 p-3 text-xs">
            <p className="text-amber-200/90">1. In Google Authenticator: add account, scan this QR (or enter key)</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupUrl)}`}
              alt="Authenticator QR"
              className="mx-auto rounded border border-white/10 bg-white p-1"
              width={180}
              height={180}
            />
            <a
              href={setupUrl}
              className="block break-all font-mono text-[10px] text-zinc-500"
              target="_blank"
              rel="noreferrer"
            >
              {setupUrl}
            </a>
            {setupSecret && (
              <p className="font-mono text-[10px] text-zinc-500">
                Manual key: <span className="text-zinc-300">{setupSecret}</span>
              </p>
            )}
            <p className="pt-1 text-amber-200/90">2. Type a current 6-digit code to enable 2FA on login:</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border border-white/10 bg-zinc-950 px-2 py-1"
                value={enableCode}
                onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
              />
              <button
                type="button"
                className="rounded bg-emerald-600/80 px-2 py-1 text-white"
                onClick={async () => {
                  const j = await post2fa("enable", { code: enableCode });
                  if (j?.ok) {
                    toast.success("2FA is now required on your next login");
                    setEnableCode("");
                    setSetupUrl(null);
                    setSetupSecret(null);
                    void load();
                  }
                }}
              >
                Enable
              </button>
            </div>
          </div>
        )}

        {s2?.totpEnabled && (
          <div className="space-y-2 border-t border-white/5 pt-3 text-xs">
            <p className="text-zinc-500">Disable 2FA (requires password + one valid TOTP code)</p>
            <input
              type="password"
              className="mb-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Account password"
            />
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border border-white/10 bg-zinc-950 px-2 py-1"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
              />
              <button
                type="button"
                className="rounded bg-zinc-700 px-2 py-1 text-zinc-200"
                onClick={async () => {
                  const j = await post2fa("disable", { code: disableCode, password: disablePassword });
                  if (j?.ok) {
                    toast.success("2FA disabled");
                    setDisableCode("");
                    setDisablePassword("");
                    void load();
                  }
                }}
              >
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>

      <h2 className="mb-2 text-sm font-medium text-zinc-300">Activity log</h2>
      <TableShell>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Action</th>
              <th className="p-2">Admin</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((r) => (
              <tr key={r._id} className="border-t border-white/5">
                <td className="p-2 text-[10px] text-zinc-500">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                </td>
                <td className="p-2 font-mono text-xs">{r.action}</td>
                <td className="p-2 text-xs">{r.adminEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
