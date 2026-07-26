"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { rollupFromRows, type Student, type StudentMatchRow } from "../../../lib/coach";
import type { RatingsRollup, SkillRatings } from "../../../lib/analysis";

const SKILL_LABELS: Record<keyof SkillRatings, string> = {
  serve: "Serve",
  return: "Return",
  offense: "Offense",
  defense: "Defense",
  consistency: "Consistency",
};

function SkillBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(1, (value - 2) / 6)) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
      <span className="muted" style={{ width: 100, flexShrink: 0, fontSize: 13, fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "var(--bg)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)", borderRadius: 999 }} />
      </div>
      <span style={{ width: 34, flexShrink: 0, textAlign: "right", fontWeight: 700, fontSize: 13 }}>{value.toFixed(1)}</span>
    </div>
  );
}

export default function StudentProgressPage() {
  const params = useParams();
  const rawId = (params as { studentId?: string | string[] })?.studentId;
  const studentId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [rows, setRows] = useState<StudentMatchRow[]>([]);
  const [rollup, setRollup] = useState<RatingsRollup | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !studentId) {
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
      const { data: s } = await supabase.from("students").select("*").eq("id", studentId).maybeSingle();
      setStudent((s as Student) ?? null);
      if (s) {
        const { data: matches } = await supabase
          .from("matches")
          .select("id,title,student_id,recorded_at,created_at,result,shot_analysis")
          .eq("student_id", studentId)
          .order("created_at", { ascending: true });
        const list = (matches as StudentMatchRow[]) || [];
        setRows(list);
        setRollup(rollupFromRows(list));
      }
      setLoading(false);
    })();
  }, [studentId]);

  const fmtDate = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";

  function matchRating(m: StudentMatchRow): number | null {
    const r = m.shot_analysis?.analysis?.ratings;
    if (!r) return null;
    const vals = [r.serve, r.return, r.offense, r.defense, r.consistency].map((v) => Number(v) || 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  if (loading) return <div className="muted" style={{ marginTop: 24 }}>Loading…</div>;
  if (!signedIn)
    return (
      <div className="card" style={{ marginTop: 20 }}>
        <p className="muted">You&apos;re not signed in.</p>
        <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Sign in</Link>
      </div>
    );
  if (!student)
    return (
      <div>
        <Link href="/coach" className="muted" style={{ fontSize: 13 }}>← Coach dashboard</Link>
        <div className="card" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>Student not found (it may have been removed).</p>
        </div>
      </div>
    );

  const skills = Object.keys(SKILL_LABELS) as (keyof SkillRatings)[];

  return (
    <div>
      <Link href="/coach" className="muted" style={{ fontSize: 13 }}>← Coach dashboard</Link>
      <h1 className="page-title" style={{ marginTop: 8 }}>{student.name}</h1>
      <p className="page-sub">
        {rows.length} tagged match{rows.length === 1 ? "" : "es"}
        {student.notes ? ` · ${student.notes}` : ""}
      </p>

      {!rollup ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted" style={{ margin: 0 }}>
            No analyzed matches yet. Open one of {student.name.split(" ")[0]}&apos;s matches, run the AI shot breakdown, and use{" "}
            <b>“Assign to student”</b> to tag it here.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 22, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", alignItems: "start" }}>
          {/* Rating + record */}
          <div className="card" style={{ borderColor: "rgba(163,230,53,0.4)" }}>
            <div className="section-title">Career rating</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 46, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{rollup.overall.toFixed(1)}</span>
              <span className="muted" style={{ fontSize: 13 }}>AI estimate · DUPR scale</span>
            </div>
            {rollup.wins + rollup.losses > 0 && (
              <div style={{ marginTop: 10, fontSize: 14 }}>
                <b>{rollup.wins}</b> W · <b>{rollup.losses}</b> L
                <span className="muted"> ({Math.round((rollup.wins / (rollup.wins + rollup.losses)) * 100)}% win rate)</span>
              </div>
            )}
          </div>

          {/* Skill breakdown */}
          <div className="card">
            <div className="section-title">Skill breakdown</div>
            <div style={{ marginTop: 14 }}>
              {skills.map((k) => (
                <SkillBar key={k} label={SKILL_LABELS[k]} value={rollup.ratings[k]} />
              ))}
            </div>
          </div>

          {/* Matches */}
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="section-title">Matches</div>
            <div style={{ marginTop: 10 }}>
              {rows
                .slice()
                .reverse()
                .map((m) => {
                  const rating = matchRating(m);
                  return (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                        color: "var(--text)",
                        textDecoration: "none",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.title || "Match"}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {fmtDate(m.recorded_at || m.created_at)}
                          {m.result === "win" ? " · WIN" : m.result === "loss" ? " · LOSS" : ""}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, fontWeight: 700, color: rating != null ? "var(--primary)" : "var(--text-muted)" }}>
                        {rating != null ? rating.toFixed(1) : "—"}
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
