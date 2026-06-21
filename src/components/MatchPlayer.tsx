"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { VIDEO_BUCKET } from "../lib/supabase/config";
import { inferEndpointPublic, type InferenceResult } from "../lib/analysis";

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
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<InferenceResult | null>(
    (match.ball_analysis as InferenceResult) || null
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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

  async function runAnalysis() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const endpoint = inferEndpointPublic();
      if (!endpoint) throw new Error("Inference service URL is not configured.");
      if (!match.video_path) throw new Error("This match has no uploaded video.");

      // Sign the private video URL in the browser, then call the service directly.
      const { data: signed, error: sErr } = await supabase.storage
        .from(VIDEO_BUCKET)
        .createSignedUrl(match.video_path, 600);
      if (sErr || !signed?.signedUrl) throw new Error("Could not sign the video URL.");

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoUrl: signed.signedUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || `Inference failed (${res.status}).`);
      setAnalysis(data);
      // Persist so it doesn't re-run on every visit (ignore errors so a failed
      // save never hides a good result).
      await supabase
        .from("matches")
        .update({ ball_analysis: data, ball_analyzed_at: new Date().toISOString() })
        .eq("id", match.id);
    } catch (e: any) {
      setAnalysisError(e?.message || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
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

          <div className="card" style={{ borderColor: "rgba(163,230,53,0.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title">Ball detection</div>
              <span className="badge badge-average" style={{ fontSize: 11 }}>beta</span>
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
              Runs real computer-vision ball detection on this video via the inference service.
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 12, opacity: analyzing || !videoUrl ? 0.6 : 1 }}
              onClick={runAnalysis}
              disabled={analyzing || !videoUrl}
            >
              {analyzing ? "Analyzing… (up to a minute)" : analysis ? "↻ Re-run detection" : "▶ Run ball detection"}
            </button>

            {analysisError && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--poor)" }}>{analysisError}</div>
            )}

            {analysis && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Metric label="Ball hits found" value={String(analysis.detectionsFound)} />
                  <Metric label="Video length" value={`${analysis.duration.toFixed(1)}s`} />
                  <Metric label="Frames scanned" value={String(analysis.totalFrames)} />
                  <Metric label="Source FPS" value={analysis.fps.toFixed(0)} />
                </div>
                <div className="dim" style={{ fontSize: 11.5, margin: "12px 0 6px" }}>
                  Detected ball positions on the court
                </div>
                <CourtScatter detections={analysis.detections} />
                <p className="dim" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
                  Note: this detects ball positions only (color-based). Shot types &amp; grading come in the next step.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px" }}>
      <div className="dim" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>{value}</div>
    </div>
  );
}

// Plots detected ball positions on a pickleball court (20ft wide x 44ft long).
function CourtScatter({
  detections,
}: {
  detections: { courtX: number; courtY: number; confidence: number }[];
}) {
  const w = 200;
  const h = 360;
  const pad = 8;
  const x = (ft: number) => pad + (Math.min(20, Math.max(0, ft)) / 20) * (w - pad * 2);
  const y = (ft: number) => pad + (Math.min(44, Math.max(0, ft)) / 44) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w }}>
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} fill="#16243f" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      {/* net at mid-court */}
      <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="#fff" strokeWidth={2} />
      {/* kitchen lines (7ft each side of net) */}
      <line x1={pad} y1={y(15)} x2={w - pad} y2={y(15)} stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" />
      <line x1={pad} y1={y(29)} x2={w - pad} y2={y(29)} stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" />
      {detections.map((d, i) => (
        <circle key={i} cx={x(d.courtX)} cy={y(d.courtY)} r={3} fill="var(--primary)" opacity={0.35 + d.confidence * 0.55} />
      ))}
      {detections.length === 0 && (
        <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={11} fill="var(--text-dim)">No balls detected</text>
      )}
    </svg>
  );
}
