"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { rollupFromRows, type Student, type StudentMatchRow } from "../../lib/coach";

type RosterEntry = {
  student: Student;
  overall: number | null;
  count: number;
  wins: number;
  losses: number;
};

export default function CoachPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id ?? null;
    setUid(id);
    if (!id) {
      setLoading(false);
      return;
    }
    const studentsRes = await supabase.from("students").select("*").eq("coach_id", id).order("created_at", { ascending: true });
    const students = (studentsRes.data as Student[]) || [];

    const { data: tagged } = await supabase
      .from("matches")
      .select("id,title,student_id,user_id,recorded_at,created_at,result,shot_analysis")
      .not("student_id", "is", null)
      .order("created_at", { ascending: true });

    const byStudent = new Map<string, StudentMatchRow[]>();
    const push = (sid: string, m: StudentMatchRow) => {
      const arr = byStudent.get(sid) || [];
      if (!arr.some((x) => x.id === m.id)) arr.push(m);
      byStudent.set(sid, arr);
    };
    for (const m of (tagged as (StudentMatchRow & { student_id: string })[]) || []) push(m.student_id, m);

    // Active linked students: also include the matches they analyzed themselves.
    const linked = students.filter((s) => s.status === "active" && s.linked_user_id);
    if (linked.length) {
      const userToStudent = new Map(linked.map((s) => [s.linked_user_id as string, s.id]));
      const { data: own } = await supabase
        .from("matches")
        .select("id,title,student_id,user_id,recorded_at,created_at,result,shot_analysis")
        .in("user_id", linked.map((s) => s.linked_user_id as string))
        .order("created_at", { ascending: true });
      for (const m of (own as (StudentMatchRow & { user_id: string })[]) || []) {
        const sid = userToStudent.get(m.user_id);
        if (sid) push(sid, m);
      }
    }

    const entries: RosterEntry[] = students.map((s) => {
      const rows = byStudent.get(s.id) || [];
      const roll = rollupFromRows(rows);
      return {
        student: s,
        overall: roll?.overall ?? null,
        count: rows.length,
        wins: roll?.wins ?? 0,
        losses: roll?.losses ?? 0,
      };
    });
    setRoster(entries);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy || !uid) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("students").insert({
        coach_id: uid,
        name: n,
        email: email.trim() || null,
        notes: notes.trim() || null,
      });
      if (err) throw new Error(err.message);
      setName("");
      setEmail("");
      setNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the student.");
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(id: string, studentName: string) {
    if (!confirm(`Remove ${studentName} from your roster? Their matches stay in your library (just untagged).`)) return;
    const supabase = createClient();
    await supabase.from("students").delete().eq("id", id);
    await load();
  }

  return (
    <div>
      <div className="eyebrow">Coaching</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Coach dashboard</h1>
      <p className="page-sub">Your roster of students. Add a student, then tag their matches to track progress.</p>

      {loading ? (
        <div className="muted" style={{ marginTop: 24 }}>Loading your roster…</div>
      ) : !uid ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted">You&apos;re not signed in.</p>
          <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Sign in</Link>
        </div>
      ) : (
        <div style={{ marginTop: 22, display: "grid", gap: 18 }}>
          {/* Add student */}
          <div className="card">
            <div className="section-title">Add a student</div>
            <form onSubmit={addStudent} style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, alignItems: "flex-end" }}>
              <label style={{ flex: "1 1 180px", fontSize: 13 }}>
                <span className="muted" style={{ display: "block", marginBottom: 4 }}>Name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam Rivera" style={inputStyle} />
              </label>
              <label style={{ flex: "1 1 180px", fontSize: 13 }}>
                <span className="muted" style={{ display: "block", marginBottom: 4 }}>Email (optional)</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="for a future invite" style={inputStyle} />
              </label>
              <label style={{ flex: "2 1 220px", fontSize: 13 }}>
                <span className="muted" style={{ display: "block", marginBottom: 4 }}>Notes (optional)</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="goals, level, etc." style={inputStyle} />
              </label>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !name.trim()}>
                {busy ? "Adding…" : "Add student"}
              </button>
            </form>
            {error && <div style={{ fontSize: 12.5, color: "var(--poor)", marginTop: 8 }}>{error}</div>}
          </div>

          {/* Roster */}
          {roster.length === 0 ? (
            <div className="card">
              <p className="muted" style={{ margin: 0 }}>No students yet. Add your first above, then open a match and use <b>“Assign to student”</b> to tag it.</p>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              {roster.map((r) => (
                <div key={r.student.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/coach/${r.student.id}`} style={{ fontWeight: 800, fontSize: 16, color: "var(--text)", textDecoration: "none" }}>
                        {r.student.name}
                      </Link>
                      {r.student.status === "active" ? (
                        <span className="badge badge-excellent" style={{ fontSize: 10, marginLeft: 8 }}>LINKED</span>
                      ) : r.student.status === "invited" ? (
                        <span className="badge" style={{ fontSize: 10, marginLeft: 8, background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>INVITED</span>
                      ) : null}
                    </div>
                    <button
                      className="iconbtn"
                      onClick={() => removeStudent(r.student.id, r.student.name)}
                      aria-label={`Remove ${r.student.name}`}
                      title="Remove from roster"
                      style={{ width: 26, height: 26, fontSize: 12 }}
                    >
                      🗑
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>
                        {r.overall != null ? r.overall.toFixed(1) : "—"}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>AI rating</div>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {r.count} match{r.count === 1 ? "" : "es"}
                      {r.wins + r.losses > 0 ? ` · ${r.wins}W–${r.losses}L` : ""}
                    </div>
                  </div>
                  {r.student.notes && <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.4 }}>{r.student.notes}</div>}
                  <Link href={`/coach/${r.student.id}`} className="btn btn-sm" style={{ marginTop: "auto" }}>
                    View progress →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
};
