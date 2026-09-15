"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  // The recovery link runs through /auth/callback, which exchanges the code for a
  // (recovery) session before landing here. If there's a session, the user may set
  // a new password; if not, the link was invalid/expired or opened on another device.
  useEffect(() => {
    if (!isSupabaseConfigured) { setReady(true); return; }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setReady(true);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) { setMsg({ type: "error", text: "Password must be at least 6 characters." }); return; }
    if (password !== confirm) { setMsg({ type: "error", text: "The two passwords don't match." }); return; }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg({ type: "error", text: error.message });
      setBusy(false);
      return;
    }
    setMsg({ type: "ok", text: "Password updated — you're all set. Taking you in…" });
    setTimeout(() => { router.push("/matches"); router.refresh(); }, 1200);
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <div className="eyebrow">Account</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Set a new password</h1>

      {!ready ? (
        <div className="muted" style={{ marginTop: 24 }}>Loading…</div>
      ) : !hasSession ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            This reset link is invalid or has expired (or was opened in a different browser). Request a fresh one from the sign-in page.
          </p>
          <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card" style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            New password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Confirm new password
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </label>

          {msg && (
            <div style={{ fontSize: 13, fontWeight: 600, color: msg.type === "error" ? "var(--poor)" : "var(--excellent)" }}>
              {msg.text}
            </div>
          )}

          <button className="btn btn-primary" disabled={busy} style={{ justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
            {busy ? "…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid var(--border-light)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 500,
};
