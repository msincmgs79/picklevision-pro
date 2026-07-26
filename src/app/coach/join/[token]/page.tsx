"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";

type Info =
  | { state: "loading" }
  | { state: "invalid"; reason: string }
  | { state: "used"; name?: string }
  | { state: "signedout"; name?: string }
  | { state: "ready"; name?: string }
  | { state: "accepted"; name?: string };

export default function JoinPage() {
  const params = useParams();
  const raw = (params as { token?: string | string[] })?.token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  const [info, setInfo] = useState<Info>({ state: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !token) {
      setInfo({ state: "invalid", reason: "no_token" });
      return;
    }
    (async () => {
      // Invite validity (public, token-gated) + whether the visitor is signed in.
      const [res, auth] = await Promise.all([
        fetch(`/api/coach/accept?token=${encodeURIComponent(token)}`).then((r) => r.json()).catch(() => ({ valid: false })),
        createClient().auth.getUser(),
      ]);
      const name = res?.name as string | undefined;
      if (!res?.valid) {
        setInfo(res?.reason === "already_linked" ? { state: "used", name } : { state: "invalid", reason: res?.reason || "not_found" });
        return;
      }
      setInfo(auth.data.user ? { state: "ready", name } : { state: "signedout", name });
    })();
  }, [token]);

  async function accept() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn't accept the invite.");
      setInfo({ state: "accepted", name: data?.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="eyebrow" style={{ marginTop: 8 }}>Coaching invite</div>

      {info.state === "loading" && <div className="muted" style={{ marginTop: 16 }}>Checking your invite…</div>}

      {info.state === "invalid" && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1 className="page-title" style={{ fontSize: 22, marginBottom: 8 }}>Invite not found</h1>
          <p className="muted" style={{ margin: 0 }}>This invite link isn&apos;t valid — it may have been withdrawn or already used.</p>
          <Link href="/" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>Go to PickleVision →</Link>
        </div>
      )}

      {info.state === "used" && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1 className="page-title" style={{ fontSize: 22, marginBottom: 8 }}>Invite already used</h1>
          <p className="muted" style={{ margin: 0 }}>This coaching invite has already been accepted.</p>
          <Link href="/" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>Go to PickleVision →</Link>
        </div>
      )}

      {info.state === "signedout" && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1 className="page-title" style={{ fontSize: 22, marginBottom: 8 }}>You&apos;ve been invited to a coaching roster</h1>
          <p className="muted" style={{ lineHeight: 1.5 }}>
            Sign in (or create a free account), then reopen this link to accept. Once you do, your coach can see the
            progress from matches you analyze.
          </p>
          <Link href={`/login?next=${encodeURIComponent(`/coach/join/${token}`)}`} className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
            Sign in to accept →
          </Link>
        </div>
      )}

      {info.state === "ready" && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1 className="page-title" style={{ fontSize: 22, marginBottom: 8 }}>Join this coaching roster?</h1>
          <p className="muted" style={{ lineHeight: 1.5 }}>
            Accepting connects your PickleVision account{info.name ? ` (as “${info.name}”)` : ""} to your coach&apos;s roster.
            They&apos;ll be able to see the ratings and progress from matches you analyze. You can keep using your account
            exactly as before.
          </p>
          {error && <div style={{ fontSize: 12.5, color: "var(--poor)", marginBottom: 8 }}>{error}</div>}
          <button className="btn btn-primary btn-sm" onClick={accept} disabled={busy}>
            {busy ? "Accepting…" : "Accept invite"}
          </button>
        </div>
      )}

      {info.state === "accepted" && (
        <div className="card" style={{ marginTop: 16, borderColor: "rgba(163,230,53,0.4)" }}>
          <h1 className="page-title" style={{ fontSize: 22, marginBottom: 8 }}>You&apos;re connected ✓</h1>
          <p className="muted" style={{ lineHeight: 1.5 }}>
            Your coach can now follow your progress. Analyze a match anytime and it&apos;ll show up for them.
          </p>
          <Link href="/matches" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Go to my matches →</Link>
        </div>
      )}
    </div>
  );
}
