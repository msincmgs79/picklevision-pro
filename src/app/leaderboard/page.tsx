"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { rollupFromRows, type StudentMatchRow } from "../../lib/coach";

type Entry = {
  user_id: string;
  display_name: string;
  rating: number | null;
  wins: number;
  losses: number;
  matches: number;
};

const MATCH_SEL = "id,title,recorded_at,created_at,result,shot_analysis";

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Entry[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [optedIn, setOptedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [myRating, setMyRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function myRollup(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase.from("matches").select(MATCH_SEL).order("created_at", { ascending: true });
    return rollupFromRows((data as StudentMatchRow[]) || []);
  }

  async function load() {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id ?? null;
    setUid(id);

    if (id) {
      const roll = await myRollup(supabase);
      setMyRating(roll?.overall ?? null);
      const { data: mine } = await supabase.from("leaderboard").select("*").eq("user_id", id).maybeSingle();
      if (mine) {
        setOptedIn(true);
        setDisplayName((mine as Entry).display_name || "");
        // Self-refresh my rating from my latest matches.
        if (roll) {
          await supabase
            .from("leaderboard")
            .update({ rating: roll.overall, wins: roll.wins, losses: roll.losses, matches: roll.count, updated_at: new Date().toISOString() })
            .eq("user_id", id);
        }
      } else {
        setOptedIn(false);
        setDisplayName((auth.user?.email || "").split("@")[0] || "");
      }
    }

    const { data: board } = await supabase
      .from("leaderboard")
      .select("user_id,display_name,rating,wins,losses,matches")
      .not("rating", "is", null)
      .order("rating", { ascending: false })
      .limit(100);
    setRows((board as Entry[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function optIn() {
    if (!uid || busy) return;
    const name = displayName.trim();
    if (!name) {
      setError("Choose a display name first.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const roll = await myRollup(supabase);
    if (!roll) {
      setError("Analyze a match first — you need an AI rating to appear.");
      setBusy(false);
      return;
    }
    await supabase.from("leaderboard").upsert({
      user_id: uid,
      display_name: name,
      rating: roll.overall,
      wins: roll.wins,
      losses: roll.losses,
      matches: roll.count,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    await load();
  }

  async function optOut() {
    if (!uid || busy) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("leaderboard").delete().eq("user_id", uid);
    setOptedIn(false);
    setBusy(false);
    await load();
  }

  async function saveName() {
    if (!uid || !optedIn || busy) return;
    const name = displayName.trim();
    if (!name) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("leaderboard").update({ display_name: name }).eq("user_id", uid);
    setBusy(false);
    await load();
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 11px",
    borderRadius: 9,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 14,
  };

  return (
    <div>
      <div className="eyebrow">Community</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Leaderboard</h1>
      <p className="page-sub">Players ranked by AI rating (an estimate on the DUPR scale — not official DUPR). Opt-in only.</p>

      {/* Opt-in controls */}
      {!loading && (
        <div className="card" style={{ marginTop: 18, borderColor: optedIn ? "rgba(163,230,53,0.4)" : "var(--border)" }}>
          {!uid ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span className="muted" style={{ fontSize: 13.5 }}>Sign in to join the leaderboard.</span>
              <Link href="/login" className="btn btn-primary btn-sm">Sign in</Link>
            </div>
          ) : optedIn ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 13.5 }}>
                <b>✓ You&apos;re on the leaderboard</b>
                <span className="muted"> as “{displayName}”{myRating != null ? ` · ${myRating.toFixed(1)}` : ""}. Only your name, rating and record are shown.</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }} />
                <button className="btn btn-sm" onClick={saveName} disabled={busy}>Save name</button>
                <button className="btn btn-sm btn-ghost" onClick={optOut} disabled={busy} style={{ color: "var(--poor)" }}>Leave</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="section-title">Join the leaderboard</div>
              <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 12px", lineHeight: 1.5 }}>
                Opt in to appear publicly. Only a <b>display name</b> you choose, your AI rating and win/loss are shown —
                never your email, videos, or anything else. Leave anytime.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" style={{ ...inputStyle, maxWidth: 200 }} />
                <button className="btn btn-primary btn-sm" onClick={optIn} disabled={busy || !displayName.trim()}>
                  {busy ? "Joining…" : "Join leaderboard"}
                </button>
                {myRating == null && <span className="muted" style={{ fontSize: 12.5 }}>Analyze a match first to get a rating.</span>}
              </div>
              {error && <div style={{ fontSize: 12.5, color: "var(--poor)", marginTop: 8 }}>{error}</div>}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="muted" style={{ marginTop: 24 }}>Loading the leaderboard…</div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>No one&apos;s on the leaderboard yet — be the first to join.</p>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 18, padding: "6px 0" }}>
          {rows.map((r, i) => {
            const mine = r.user_id === uid;
            return (
              <div
                key={r.user_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 18px",
                  borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
                  background: mine ? "rgba(163,230,53,0.06)" : "transparent",
                }}
              >
                <div style={{ width: 30, flexShrink: 0, fontWeight: 800, fontSize: 15, color: i < 3 ? "var(--primary)" : "var(--text-muted)", textAlign: "center" }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.display_name}
                  {mine && <span className="badge badge-excellent" style={{ fontSize: 10, marginLeft: 8 }}>YOU</span>}
                </div>
                <div className="muted" style={{ flexShrink: 0, fontSize: 13, width: 90, textAlign: "right" }}>
                  {r.wins + r.losses > 0 ? `${r.wins}–${r.losses}` : "—"}
                  <span className="dim"> · {r.matches}g</span>
                </div>
                <div style={{ flexShrink: 0, width: 52, textAlign: "right", fontWeight: 800, fontSize: 17, color: "var(--primary)" }}>
                  {r.rating != null ? r.rating.toFixed(1) : "—"}
                </div>
              </div>
            );
          })}
          <div className="dim" style={{ fontSize: 11, padding: "10px 18px 4px" }}>rank · name · record · AI rating (DUPR scale, estimate)</div>
        </div>
      )}
    </div>
  );
}
