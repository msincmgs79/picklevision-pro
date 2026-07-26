"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import type { Drill } from "../../../lib/coach";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
};

export default function DrillLibraryPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
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
    if (id) {
      const { data } = await supabase.from("drills").select("*").eq("coach_id", id).order("created_at", { ascending: false });
      setDrills((data as Drill[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addDrill(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || busy || !uid) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("drills").insert({
        coach_id: uid,
        title: t,
        category: category.trim() || null,
        description: description.trim() || null,
        video_url: videoUrl.trim() || null,
      });
      if (err) throw new Error(err.message);
      setTitle("");
      setCategory("");
      setDescription("");
      setVideoUrl("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the drill.");
    } finally {
      setBusy(false);
    }
  }

  async function removeDrill(id: string, name: string) {
    if (!confirm(`Delete the drill “${name}”? Existing assignments keep their copy.`)) return;
    const supabase = createClient();
    await supabase.from("drills").delete().eq("id", id);
    await load();
  }

  return (
    <div>
      <Link href="/coach" className="muted" style={{ fontSize: 13 }}>← Coach dashboard</Link>
      <h1 className="page-title" style={{ marginTop: 8 }}>Drill library</h1>
      <p className="page-sub">Build reusable drills, then assign them to students from their page.</p>

      {loading ? (
        <div className="muted" style={{ marginTop: 24 }}>Loading…</div>
      ) : !uid ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="muted">You&apos;re not signed in.</p>
          <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Sign in</Link>
        </div>
      ) : (
        <div style={{ marginTop: 22, display: "grid", gap: 18 }}>
          <div className="card">
            <div className="section-title">New drill</div>
            <form onSubmit={addDrill} style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={{ flex: "2 1 220px", fontSize: 13 }}>
                  <span className="muted" style={{ display: "block", marginBottom: 4 }}>Title *</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Third-shot drop reps" style={inputStyle} />
                </label>
                <label style={{ flex: "1 1 150px", fontSize: 13 }}>
                  <span className="muted" style={{ display: "block", marginBottom: 4 }}>Category</span>
                  <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Dinking" style={inputStyle} />
                </label>
              </div>
              <label style={{ fontSize: 13 }}>
                <span className="muted" style={{ display: "block", marginBottom: 4 }}>Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="How to do it, reps, focus points…" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </label>
              <label style={{ fontSize: 13 }}>
                <span className="muted" style={{ display: "block", marginBottom: 4 }}>Video link (optional)</span>
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
              </label>
              <div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !title.trim()}>
                  {busy ? "Saving…" : "Add drill"}
                </button>
                {error && <span style={{ fontSize: 12.5, color: "var(--poor)", marginLeft: 10 }}>{error}</span>}
              </div>
            </form>
          </div>

          {drills.length === 0 ? (
            <div className="card"><p className="muted" style={{ margin: 0 }}>No drills yet — add your first above.</p></div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              {drills.map((d) => (
                <div key={d.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{d.title}</div>
                    <button className="iconbtn" onClick={() => removeDrill(d.id, d.title)} aria-label="Delete drill" style={{ width: 26, height: 26, fontSize: 12 }}>🗑</button>
                  </div>
                  {d.category && <span className="badge" style={{ fontSize: 10, alignSelf: "flex-start", background: "var(--indigo-dim, rgba(99,102,241,0.15))" }}>{d.category}</span>}
                  {d.description && <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: "2px 0 0" }}>{d.description}</p>}
                  {d.video_url && (
                    <a href={d.video_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--primary)" }}>▷ Watch</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
