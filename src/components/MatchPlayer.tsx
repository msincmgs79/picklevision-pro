"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { VIDEO_BUCKET } from "../lib/supabase/config";

interface Bookmark {
  id: string;
  t: number;
  label: string | null;
}

export default function MatchPlayer({
  match,
  videoUrl,
  initialBookmarks,
}: {
  match: any;
  videoUrl: string | null;
  initialBookmarks: Bookmark[];
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(match.duration_seconds || 0);
  const [drawMode, setDrawMode] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => setDuration(v.duration || duration);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, [duration]);

  function seek(t: number) {
    if (videoRef.current) videoRef.current.currentTime = t;
    setTime(t);
  }

  // ---- drawing ----
  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }
  function down(e: React.PointerEvent) {
    if (!drawMode) return;
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(e: React.PointerEvent) {
    if (!drawMode || !drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = "#a3e635";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  const up = () => (drawing.current = false);
  function clearDraw() {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }

  // ---- bookmarks ----
  async function addBookmark() {
    const t = Math.round(time);
    const label = `Mark @ ${fmt(t)}`;
    const { data, error } = await supabase
      .from("bookmarks")
      .insert({ match_id: match.id, t, label })
      .select()
      .single();
    if (!error && data) setBookmarks((b) => [...b, data].sort((a, z) => a.t - z.t));
  }
  async function removeBookmark(id: string) {
    setBookmarks((b) => b.filter((x) => x.id !== id));
    await supabase.from("bookmarks").delete().eq("id", id);
  }

  async function deleteMatch() {
    if (!confirm("Delete this match and its video? This cannot be undone.")) return;
    setDeleting(true);
    if (match.video_path) await supabase.storage.from(VIDEO_BUCKET).remove([match.video_path]);
    await supabase.from("matches").delete().eq("id", match.id);
    router.push("/matches");
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Link href="/matches" className="dim" style={{ fontSize: 13 }}>← My Matches</Link>
          <h1 className="page-title" style={{ marginTop: 6 }}>{match.title}</h1>
          <p className="page-sub">
            {match.team} vs {match.opponent}
            {match.score ? ` · ${match.score}` : ""}
            {match.recorded_at ? ` · ${match.recorded_at}` : ""}
          </p>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={deleteMatch} disabled={deleting} style={{ color: "var(--poor)" }}>
          {deleting ? "Deleting…" : "Delete match"}
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 22, alignItems: "start" }}>
        {/* player */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#05080f", aspectRatio: "16 / 9" }}>
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
              />
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%", textAlign: "center", padding: 24 }}>
                <div>
                  <div style={{ fontSize: 40 }}>⚠️</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>Video unavailable</div>
                  <div className="muted" style={{ fontSize: 13 }}>The file may still be uploading or was removed.</div>
                </div>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerLeave={up}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: drawMode ? "crosshair" : "default", touchAction: "none", pointerEvents: drawMode ? "auto" : "none" }}
            />
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", padding: "5px 11px", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
              {fmt(time)} <span className="dim">/ {fmt(duration)}</span>
            </div>
            {drawMode && (
              <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(163,230,53,0.2)", color: "var(--primary)", padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>✎ Draw</div>
            )}
          </div>

          {/* timeline */}
          <div style={{ position: "relative", marginTop: 14, height: 22 }}>
            <div
              className="progress"
              style={{ height: 8, cursor: "pointer", marginTop: 4 }}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                seek(((e.clientX - r.left) / r.width) * (duration || 0));
              }}
            >
              <div className="progress-bar" style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
            </div>
            {bookmarks.map((b) => (
              <span key={b.id} title={b.label || ""} onClick={() => seek(b.t)} style={{ position: "absolute", top: -2, left: `${duration ? (b.t / duration) * 100 : 0}%`, transform: "translateX(-50%)", color: "var(--primary)", fontSize: 13, cursor: "pointer" }}>★</span>
            ))}
          </div>

          {/* controls */}
          <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-primary btn-sm" onClick={() => (videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause())}>▶ / ❚❚</button>
            <button className="btn btn-sm" onClick={() => seek(Math.max(0, time - 5))}>« 5s</button>
            <button className="btn btn-sm" onClick={() => seek(Math.min(duration, time + 5))}>5s »</button>
            <span style={{ flex: 1 }} />
            <button className={"btn btn-sm" + (drawMode ? " btn-indigo" : "")} onClick={() => setDrawMode((d) => !d)}>✎ Draw</button>
            <button className="btn btn-sm btn-ghost" onClick={clearDraw}>Clear</button>
            <button className="btn btn-sm" onClick={addBookmark}>★ Bookmark</button>
          </div>
        </div>

        {/* side */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>Bookmarks</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Saved moments — click to jump.</div>
            {bookmarks.length === 0 ? (
              <div className="dim" style={{ fontSize: 13 }}>No bookmarks yet. Hit ★ Bookmark while watching.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bookmarks.map((b) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px" }}>
                    <button onClick={() => seek(b.t)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{fmt(b.t)}</button>
                    <span style={{ flex: 1, fontSize: 13 }}>{b.label}</span>
                    <button onClick={() => removeBookmark(b.id)} className="dim" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ borderColor: "rgba(129,140,248,0.35)" }}>
            <div className="section-title" style={{ marginBottom: 4 }}>AI analysis</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
              Automatic shot tracking for your uploads is coming as the next phase. See what the analyzed view looks like on the demo match.
            </p>
            <Link href="/analysis" className="btn btn-sm btn-indigo" style={{ marginTop: 12 }}>Preview analysis →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
