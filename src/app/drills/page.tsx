"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import type { DrillAssignment } from "../../lib/coach";

const SOURCE_BADGE: Record<DrillAssignment["source"], { label: string; bg: string; fg: string }> = {
  ai: { label: "✨ AI", bg: "rgba(163,230,53,0.16)", fg: "var(--primary)" },
  coach: { label: "Coach", bg: "rgba(99,102,241,0.16)", fg: "var(--indigo, #818cf8)" },
  self: { label: "You", bg: "var(--surface)", fg: "var(--text-muted)" },
};

export default function MyDrillsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [items, setItems] = useState<DrillAssignment[]>([]);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [nTitle, setNTitle] = useState("");
  const [nDesc, setNDesc] = useState("");

  async function load() {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    // 1) Drills that belong to me directly (AI-generated + self-added).
    const { data: own } = await supabase
      .from("drill_assignments")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    // 2) Drills a coach assigned to my linked roster entry (existing flow).
    const { data: rows } = await supabase.from("students").select("id").eq("linked_user_id", uid);
    const ids = ((rows as { id: string }[]) || []).map((r) => r.id);
    let assigned: DrillAssignment[] = [];
    if (ids.length) {
      const { data } = await supabase
        .from("drill_assignments")
        .select("*")
        .in("student_id", ids)
        .order("created_at", { ascending: false });
      assigned = (data as DrillAssignment[]) || [];
    }
    // Merge + dedupe by id, newest first.
    const map = new Map<string, DrillAssignment>();
    for (const d of [...((own as DrillAssignment[]) || []), ...assigned]) map.set(d.id, d);
    const merged = Array.from(map.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setItems(merged);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await fetch("/api/drills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Couldn't generate drills.");
      } else {
        const added = (data.drills as DrillAssignment[]) || [];
        setItems((list) => [...added, ...list]);
        setMsg(`Added ${added.length} drill${added.length === 1 ? "" : "s"} from ${data.matchTitle}.`);
      }
    } catch {
      setMsg("Couldn't reach the drill generator. Please try again.");
    }
    setGenerating(false);
  }

  async function addOwn() {
    const title = nTitle.trim();
    if (!title) return;
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from("drill_assignments")
      .insert({ user_id: uid, source: "self", title, description: nDesc.trim() || null, done: false })
      .select("*")
      .single();
    if (!error && data) {
      setItems((list) => [data as DrillAssignment, ...list]);
      setNTitle("");
      setNDesc("");
      setAdding(false);
    }
  }

  async function remove(a: DrillAssignment) {
    const supabase = createClient();
    setItems((list) => list.filter((x) => x.id !== a.id));
    await supabase.from("drill_assignments").delete().eq("id", a.id);
  }

  async function toggleDone(a: DrillAssignment) {
    const supabase = createClient();
    setItems((list) => list.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)));
    await supabase.from("drill_assignments").update({ done: !a.done }).eq("id", a.id);
  }

  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <div>
      <div className="eyebrow">Coaching</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>My drills</h1>
      <p className="page-sub">
        Practice drills — generated from your game breakdown, assigned by a coach, or added by you. Tick them off as you go.
      </p>

      {signedIn && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating}>
            {generating ? "Generating…" : "✨ Generate from my last game"}
          </button>
          <button className="btn btn-sm" onClick={() => setAdding((v) => !v)} disabled={generating}>
            ＋ Add your own
          </button>
        </div>
      )}

      {msg && (
        <p className="muted" style={{ marginTop: 12, fontSize: 13.5 }}>
          {msg}
        </p>
      )}

      {adding && (
        <div className="card" style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <input
            placeholder="Drill name (e.g. Cross-court dink rally)"
            value={nTitle}
            onChange={(e) => setNTitle(e.target.value)}
            style={{ ...inputStyle, marginTop: 0, fontWeight: 600 }}
          />
          <textarea
            placeholder="How to run it (optional)"
            value={nDesc}
            onChange={(e) => setNDesc(e.target.value)}
            rows={3}
            style={{ ...inputStyle, marginTop: 0, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addOwn} disabled={!nTitle.trim()}>
              Add drill
            </button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="muted" style={{ marginTop: 24 }}>Loading…</div>
      ) : !signedIn ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted">You&apos;re not signed in.</p>
          <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Sign in</Link>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted" style={{ margin: 0 }}>
            No drills yet. Hit <strong>✨ Generate from my last game</strong> to turn your breakdown into targeted drills,
            add your own, or ask a coach to assign some.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 22, display: "grid", gap: 12 }}>
          {[...open, ...done].map((a) => {
            const badge = SOURCE_BADGE[a.source] || SOURCE_BADGE.self;
            const canDelete = a.source !== "coach";
            return (
              <div key={a.id} className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start", opacity: a.done ? 0.6 : 1 }}>
                <button
                  onClick={() => toggleDone(a)}
                  aria-label={a.done ? "Mark not done" : "Mark done"}
                  style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: 7,
                    border: "1px solid " + (a.done ? "var(--primary)" : "var(--border)"),
                    background: a.done ? "var(--primary)" : "transparent",
                    color: "#0a0e1a", cursor: "pointer", fontWeight: 800, marginTop: 2,
                  }}
                >
                  {a.done ? "✓" : ""}
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15, textDecoration: a.done ? "line-through" : "none" }}>{a.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: badge.bg, color: badge.fg }}>
                      {badge.label}
                    </span>
                  </div>
                  {a.description && <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, margin: "4px 0 0" }}>{a.description}</p>}
                  {a.note && <p style={{ fontSize: 13, lineHeight: 1.5, margin: "6px 0 0", color: "var(--primary)" }}>{a.note}</p>}
                </div>
                {canDelete && (
                  <button
                    onClick={() => remove(a)}
                    aria-label="Delete drill"
                    title="Delete"
                    style={{ flexShrink: 0, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 2 }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: CSSProperties = {
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
