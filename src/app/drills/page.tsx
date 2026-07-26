"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import type { DrillAssignment } from "../../lib/coach";

export default function MyDrillsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [items, setItems] = useState<DrillAssignment[]>([]);

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
    // Roster entries that link to me, then the drills assigned to them.
    const { data: rows } = await supabase.from("students").select("id").eq("linked_user_id", uid);
    const ids = ((rows as { id: string }[]) || []).map((r) => r.id);
    if (ids.length) {
      const { data } = await supabase
        .from("drill_assignments")
        .select("*")
        .in("student_id", ids)
        .order("created_at", { ascending: false });
      setItems((data as DrillAssignment[]) || []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <p className="page-sub">Drills your coach assigned you. Tick them off as you practice.</p>

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
            No drills assigned yet. If a coach invited you, accept their link and they&apos;ll be able to assign drills here.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 22, display: "grid", gap: 12 }}>
          {[...open, ...done].map((a) => (
            <div key={a.id} className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start", opacity: a.done ? 0.6 : 1 }}>
              <button
                onClick={() => toggleDone(a)}
                aria-label={a.done ? "Mark not done" : "Mark done"}
                style={{
                  flexShrink: 0,
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  border: "1px solid " + (a.done ? "var(--primary)" : "var(--border)"),
                  background: a.done ? "var(--primary)" : "transparent",
                  color: "#0a0e1a",
                  cursor: "pointer",
                  fontWeight: 800,
                  marginTop: 2,
                }}
              >
                {a.done ? "✓" : ""}
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, textDecoration: a.done ? "line-through" : "none" }}>{a.title}</div>
                {a.description && <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, margin: "4px 0 0" }}>{a.description}</p>}
                {a.note && <p style={{ fontSize: 13, lineHeight: 1.5, margin: "6px 0 0", color: "var(--primary)" }}>Coach note: {a.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
