"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg({ type: "ok", text: "Account created. If email confirmation is on, check your inbox — otherwise you're in." });
        const { data } = await supabase.auth.getSession();
        if (data.session) router.push("/matches");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/matches");
        router.refresh();
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <div className="eyebrow">Account</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>
        {mode === "signin" ? "Sign in" : "Create your account"}
      </h1>
      <p className="page-sub">Upload matches and keep your own analysis library.</p>

      {!isSupabaseConfigured && (
        <div className="card" style={{ marginTop: 20, borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.08)" }}>
          <div style={{ fontWeight: 700, color: "var(--average)" }}>Backend not connected yet</div>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
            Accounts and uploads turn on once Supabase keys are added to the project. Until then you can explore the{" "}
            <Link href="/analysis" style={{ color: "var(--primary)" }}>demo match</Link>.
          </div>
        </div>
      )}

      <form onSubmit={submit} className="card" style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          Password
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

        {msg && (
          <div style={{ fontSize: 13, fontWeight: 600, color: msg.type === "error" ? "var(--poor)" : "var(--excellent)" }}>
            {msg.text}
          </div>
        )}

        <button className="btn btn-primary" disabled={busy || !isSupabaseConfigured} style={{ justifyContent: "center", opacity: busy || !isSupabaseConfigured ? 0.6 : 1 }}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="muted" style={{ fontSize: 13.5, marginTop: 16, textAlign: "center" }}>
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
          style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </div>
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
