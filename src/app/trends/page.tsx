"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import type { ShotAnalysisResult } from "../../lib/analysis";

type Row = {
  id: string;
  title: string | null;
  team: string | null;
  opponent: string | null;
  result: string | null;
  recorded_at: string | null;
  created_at: string | null;
  shot_analysis: ShotAnalysisResult | null;
};

function ratingOf(m: Row): number | null {
  const r = m.shot_analysis?.analysis?.ratings;
  if (!r) return null;
  const v = [r.serve, r.return, r.offense, r.defense, r.consistency].map((x) => Number(x) || 0);
  return v.reduce((a, b) => a + b, 0) / v.length;
}

type Group = { key: string; matches: number; wins: number; losses: number; ratingSum: number; ratingN: number };

function group(rows: Row[], pick: (m: Row) => string | null): Group[] {
  const map = new Map<string, Group>();
  for (const m of rows) {
    const key = (pick(m) || "").trim();
    if (!key) continue;
    const g = map.get(key) || { key, matches: 0, wins: 0, losses: 0, ratingSum: 0, ratingN: 0 };
    g.matches++;
    if (m.result === "win") g.wins++;
    else if (m.result === "loss") g.losses++;
    const rt = ratingOf(m);
    if (rt != null) {
      g.ratingSum += rt;
      g.ratingN++;
    }
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.matches - a.matches);
}

export default function TrendsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("matches")
        .select("id,title,team,opponent,result,recorded_at,created_at,shot_analysis")
        .order("created_at", { ascending: true });
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const decided = rows.filter((m) => m.result === "win" || m.result === "loss");
    const wins = decided.filter((m) => m.result === "win").length;
    const losses = decided.length - wins;

    // Current streak (from the most recent decided match backwards).
    let streak = 0;
    let streakKind: "win" | "loss" | null = null;
    for (let i = decided.length - 1; i >= 0; i--) {
      const r = decided[i].result as "win" | "loss";
      if (streakKind === null) {
        streakKind = r;
        streak = 1;
      } else if (r === streakKind) streak++;
      else break;
    }

    // Rating momentum: recent 3 analyzed vs the 3 before.
    const rated = rows.map(ratingOf).filter((x): x is number => x != null);
    const recent = rated.slice(-3);
    const prior = rated.slice(-6, -3);
    const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
    const recentAvg = avg(recent);
    const priorAvg = avg(prior);
    const delta = recentAvg != null && priorAvg != null ? recentAvg - priorAvg : null;

    const form = decided.slice(-8).map((m) => m.result as "win" | "loss");

    return {
      total: rows.length,
      decided: decided.length,
      wins,
      losses,
      streak,
      streakKind,
      currentRating: recentAvg,
      delta,
      form,
      byPartner: group(rows, (m) => m.team),
      byOpponent: group(rows, (m) => m.opponent),
    };
  }, [rows]);

  if (loading) return <div className="muted" style={{ marginTop: 24 }}>Loading your trends…</div>;
  if (!signedIn)
    return (
      <div>
        <div className="eyebrow">Progress</div>
        <h1 className="page-title" style={{ marginTop: 6 }}>Trends &amp; Matchups</h1>
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted">You&apos;re not signed in.</p>
          <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Sign in</Link>
        </div>
      </div>
    );

  const winPct = stats.decided ? Math.round((stats.wins / stats.decided) * 100) : 0;

  return (
    <div>
      <div className="eyebrow">Progress</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Trends &amp; Matchups</h1>
      <p className="page-sub">Your record and rating, broken down by opponent and recent form.</p>

      {stats.total === 0 ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted" style={{ margin: 0 }}>No matches yet. Upload and analyze a few games to see your trends.</p>
        </div>
      ) : (
        <div style={{ marginTop: 22, display: "grid", gap: 16 }}>
          {/* Top stats */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <div className="stat">
              <div className="muted" style={{ fontSize: 12 }}>Record</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{stats.wins}–{stats.losses}</div>
              <div className="dim" style={{ fontSize: 11 }}>{winPct}% win rate</div>
            </div>
            <div className="stat">
              <div className="muted" style={{ fontSize: 12 }}>Current streak</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2, color: stats.streakKind === "win" ? "var(--good, #22c55e)" : stats.streakKind === "loss" ? "var(--poor)" : "var(--text)" }}>
                {stats.streak > 0 ? `${stats.streak}${stats.streakKind === "win" ? "W" : "L"}` : "—"}
              </div>
              <div className="dim" style={{ fontSize: 11 }}>{stats.streakKind === "win" ? "winning" : stats.streakKind === "loss" ? "losing" : "no decided games"}</div>
            </div>
            <div className="stat">
              <div className="muted" style={{ fontSize: 12 }}>AI rating (recent)</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2, color: "var(--primary)" }}>
                {stats.currentRating != null ? stats.currentRating.toFixed(1) : "—"}
              </div>
              <div className="dim" style={{ fontSize: 11 }}>
                {stats.delta != null ? `${stats.delta >= 0 ? "▲ +" : "▼ "}${stats.delta.toFixed(1)} vs earlier` : "DUPR scale · AI est."}
              </div>
            </div>
          </div>

          {/* Recent form */}
          {stats.form.length > 0 && (
            <div className="card">
              <div className="section-title">Recent form</div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {stats.form.map((r, i) => (
                  <span
                    key={i}
                    title={r}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 13,
                      color: "#0a0e1a",
                      background: r === "win" ? "var(--primary)" : "var(--poor)",
                    }}
                  >
                    {r === "win" ? "W" : "L"}
                  </span>
                ))}
                <span className="muted" style={{ fontSize: 12.5, alignSelf: "center", marginLeft: 4 }}>most recent →</span>
              </div>
            </div>
          )}

          {/* By opponent */}
          <div className="card">
            <div className="section-title">By opponent</div>
            {stats.byOpponent.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>Add opponent names on your matches to see head-to-head records.</p>
            ) : (
              <div style={{ marginTop: 10 }}>
                {stats.byOpponent.map((g) => (
                  <div key={g.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.key}</div>
                    <div style={{ display: "flex", gap: 16, flexShrink: 0, fontSize: 13 }}>
                      <span><b>{g.wins}</b>–<b>{g.losses}</b></span>
                      <span className="muted" style={{ width: 40, textAlign: "right" }}>{g.wins + g.losses ? `${Math.round((g.wins / (g.wins + g.losses)) * 100)}%` : "—"}</span>
                      <span style={{ width: 34, textAlign: "right", color: "var(--primary)", fontWeight: 700 }}>{g.ratingN ? (g.ratingSum / g.ratingN).toFixed(1) : "—"}</span>
                    </div>
                  </div>
                ))}
                <div className="dim" style={{ fontSize: 11, marginTop: 8 }}>record · win% · avg AI rating</div>
              </div>
            )}
          </div>

          {/* By team/partner */}
          <div className="card">
            <div className="section-title">By your team</div>
            {stats.byPartner.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>Set your team name on matches to compare line-ups.</p>
            ) : (
              <div style={{ marginTop: 10 }}>
                {stats.byPartner.map((g) => (
                  <div key={g.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.key}</div>
                    <div style={{ display: "flex", gap: 16, flexShrink: 0, fontSize: 13 }}>
                      <span><b>{g.wins}</b>–<b>{g.losses}</b></span>
                      <span className="muted" style={{ width: 40, textAlign: "right" }}>{g.matches} game{g.matches === 1 ? "" : "s"}</span>
                      <span style={{ width: 34, textAlign: "right", color: "var(--primary)", fontWeight: 700 }}>{g.ratingN ? (g.ratingSum / g.ratingN).toFixed(1) : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
