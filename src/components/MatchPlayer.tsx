"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { clientReadUrl, clientDelete } from "../lib/storage/client";
import {
  inferEndpointPublic,
  shotEndpointPublic,
  trackEndpointPublic,
  type InferenceResult,
  type ShotAnalysisResult,
  type TrackResult,
} from "../lib/analysis";
import TrajectoryMap3D from "./TrajectoryMap3D";
import { enablePush, isPushEnabled, notify, pushSupported } from "../lib/push";
import { analyzeRallies } from "../lib/rallies";

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
  const [shotBusy, setShotBusy] = useState(false);
  const [shot, setShot] = useState<ShotAnalysisResult | null>(
    (match.shot_analysis as ShotAnalysisResult) || null
  );
  const [shotError, setShotError] = useState<string | null>(null);
  const [corners, setCorners] = useState<number[][]>(
    Array.isArray(match.court_corners) ? match.court_corners : []
  );
  const [calibrating, setCalibrating] = useState(false);
  const [vdims, setVdims] = useState<{ w: number; h: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [track, setTrack] = useState<TrackResult | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackView, setTrackView] = useState<"3d" | "top" | "side">("3d");
  const [isPlaying, setIsPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"insights" | "shots" | "trajectories" | "rallies" | "bookmarks">("insights");
  const [editing, setEditing] = useState(false);
  const [metaTitle, setMetaTitle] = useState(match.title || "");
  const [metaTeam, setMetaTeam] = useState(match.team || "");
  const [metaOpp, setMetaOpp] = useState(match.opponent || "");
  const [pushOn, setPushOn] = useState(false);

  const supabase = createClient();
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // Restore a previously-computed full-video track so re-opening the match
  // shows the map instantly without re-spending Roboflow credits.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`pv_track_${match.id}`);
      if (cached) setTrack(JSON.parse(cached));
    } catch {}
  }, [match.id]);

  useEffect(() => {
    isPushEnabled().then(setPushOn);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => {
      setDuration(v.duration || duration);
      if (v.videoWidth) setVdims({ w: v.videoWidth, h: v.videoHeight });
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [duration]);

  // keyboard shortcuts: space = play/pause, ←/→ = seek 5s, , / . = frame-step
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const v = videoRef.current;
      if (!v) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); seek(Math.max(0, v.currentTime - 5)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seek(Math.min(duration, v.currentTime + 5)); }
      else if (e.key === ",") seek(Math.max(0, v.currentTime - 1 / 30));
      else if (e.key === ".") seek(Math.min(duration, v.currentTime + 1 / 30));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration]);

  function seek(t: number) {
    if (videoRef.current) videoRef.current.currentTime = t;
    setTime(t);
  }
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }
  function scrubAt(e: React.PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    seek(frac * (duration || 0));
  }
  async function saveMeta() {
    setEditing(false);
    await supabase
      .from("matches")
      .update({ title: metaTitle.trim() || "Untitled match", team: metaTeam.trim(), opponent: metaOpp.trim() })
      .eq("id", match.id);
  }
  const metaInput: React.CSSProperties = {
    background: "var(--surface-2)", border: "1px solid var(--border-light)", borderRadius: 8,
    padding: "8px 11px", color: "var(--text)", fontSize: 14, fontFamily: "inherit", flex: 1, minWidth: 0,
  };

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

  // ---- court calibration (for accurate in/out) ----
  function clickToNative(e: React.MouseEvent): number[] | null {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const rect = v.getBoundingClientRect();
    const scale = Math.min(rect.width / v.videoWidth, rect.height / v.videoHeight);
    const offX = (rect.width - v.videoWidth * scale) / 2;
    const offY = (rect.height - v.videoHeight * scale) / 2;
    const x = Math.max(0, Math.min(v.videoWidth, (e.clientX - rect.left - offX) / scale));
    const y = Math.max(0, Math.min(v.videoHeight, (e.clientY - rect.top - offY) / scale));
    return [Math.round(x), Math.round(y)];
  }
  async function handleCalibClick(e: React.MouseEvent) {
    if (!calibrating) return;
    const p = clickToNative(e);
    if (!p) return;
    const next = [...corners, p];
    setCorners(next);
    if (next.length >= 4) {
      setCalibrating(false);
      await supabase.from("matches").update({ court_corners: next }).eq("id", match.id);
    }
  }
  function startCalibration() {
    setCorners([]);
    setCalibrating(true);
    videoRef.current?.pause();
  }

  async function deleteMatch() {
    if (!confirm("Delete this match and its video? This cannot be undone.")) return;
    setDeleting(true);
    if (match.video_path) await clientDelete(supabase, match.video_path);
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

      // Sign the private video URL, then call the service directly.
      const videoUrl = await clientReadUrl(supabase, match.video_path, 600);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          corners: corners.length === 4 ? corners : undefined,
        }),
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

  async function runShotAnalysis() {
    setShotBusy(true);
    setShotError(null);
    try {
      const endpoint = shotEndpointPublic();
      if (!endpoint) throw new Error("Shot-analysis URL is not configured.");
      if (!match.video_path) throw new Error("This match has no uploaded video.");
      const videoUrl = await clientReadUrl(supabase, match.video_path, 600);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || `Analysis failed (${res.status}).`);
      setShot(data);
      await supabase
        .from("matches")
        .update({ shot_analysis: data, shot_analyzed_at: new Date().toISOString() })
        .eq("id", match.id);
    } catch (e: any) {
      setShotError(e?.message || "Shot analysis failed.");
    } finally {
      setShotBusy(false);
    }
  }

  async function runTracking(full = false) {
    setTracking(true);
    setTrackError(null);
    try {
      const endpoint = trackEndpointPublic();
      if (!endpoint) throw new Error("Tracking service URL is not configured.");
      if (!match.video_path) throw new Error("This match has no uploaded video.");
      const videoUrl = await clientReadUrl(supabase, match.video_path, 900);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          corners: corners.length === 4 ? corners : undefined,
          startSec: full ? 0 : Math.floor(time),
          windowSec: 20,
          fullVideo: full,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || `Tracking failed (${res.status}).`);
      setTrack(data);
      // Cache full-video results so re-opening the match doesn't re-spend credits.
      if (full) {
        try { localStorage.setItem(`pv_track_${match.id}`, JSON.stringify(data)); } catch {}
        if (pushOn) notify("Ball map ready 🎾", "Your full-match ball trajectories are ready to view.", `/matches/${match.id}`);
      }
    } catch (e: any) {
      setTrackError(e?.message || "Tracking failed.");
    } finally {
      setTracking(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href="/matches" className="dim" style={{ fontSize: 13 }}>← My Matches</Link>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, maxWidth: 480 }}>
              <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Match title" style={{ ...metaInput, fontSize: 17, fontWeight: 700 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={metaTeam} onChange={(e) => setMetaTeam(e.target.value)} placeholder="Your team" style={metaInput} />
                <span className="dim">vs</span>
                <input value={metaOpp} onChange={(e) => setMetaOpp(e.target.value)} placeholder="Opponent" style={metaInput} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={saveMeta}>Save</button>
                <button className="btn btn-sm btn-ghost" onClick={() => { setEditing(false); setMetaTitle(match.title || ""); setMetaTeam(match.team || ""); setMetaOpp(match.opponent || ""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="page-title" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {metaTitle}
                <button onClick={() => setEditing(true)} className="iconbtn" style={{ width: 28, height: 28, fontSize: 12 }} aria-label="Edit match details" title="Edit title and teams">✎</button>
              </h1>
              <p className="page-sub">
                {metaTeam} vs {metaOpp}
                {match.score ? ` · ${match.score}` : ""}
                {match.recorded_at ? ` · ${match.recorded_at}` : ""}
              </p>
            </>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <button className="iconbtn" onClick={() => setMenuOpen((o) => !o)} aria-label="Match options" title="Options">⋯</button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
              <div className="menu">
                <button className="menu-item" onClick={() => { setMenuOpen(false); deleteMatch(); }} disabled={deleting} style={{ color: "var(--poor)" }}>
                  <span aria-hidden="true">🗑</span> {deleting ? "Deleting…" : "Delete match"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 920, marginTop: 22 }}>
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
            {corners.length > 0 && vdims && (
              <svg viewBox={`0 0 ${vdims.w} ${vdims.h}`} preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                {corners.length === 4 && (
                  <polygon points={corners.map((c) => c.join(",")).join(" ")} fill="rgba(163,230,53,0.12)" stroke="var(--primary)" strokeWidth={Math.max(2, vdims.w / 400)} />
                )}
                {corners.map((c, i) => (
                  <g key={i}>
                    <circle cx={c[0]} cy={c[1]} r={Math.max(4, vdims.w / 130)} fill="var(--primary)" />
                    <text x={c[0]} y={c[1] - Math.max(8, vdims.w / 90)} fill="var(--primary)" fontSize={Math.max(12, vdims.w / 45)} textAnchor="middle" fontWeight="700">{i + 1}</text>
                  </g>
                ))}
              </svg>
            )}
            {calibrating && (
              <div onClick={handleCalibClick} style={{ position: "absolute", inset: 0, cursor: "crosshair", background: "rgba(0,0,0,0.2)" }}>
                <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                  Click corner {corners.length + 1}/4 · {["top-left", "top-right", "bottom-right", "bottom-left"][corners.length] || ""}
                </div>
              </div>
            )}
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", padding: "5px 11px", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
              {fmt(time)} <span className="dim">/ {fmt(duration)}</span>
            </div>
            {drawMode && (
              <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(163,230,53,0.2)", color: "var(--primary)", padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>✎ Draw</div>
            )}
          </div>

          {/* timeline — scrubber with AI action ticks + bookmark markers */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{ position: "relative", height: 18, display: "flex", alignItems: "center", cursor: "pointer", touchAction: "none" }}
              onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scrubAt(e); }}
              onPointerMove={(e) => { if (e.buttons === 1) scrubAt(e); }}
            >
              {analysis?.detections?.map((d, i) => (
                <span key={i} style={{ position: "absolute", top: 5, left: `${duration ? (d.timestamp / duration) * 100 : 0}%`, width: 2, height: 8, background: "var(--text-dim)", opacity: 0.5, pointerEvents: "none" }} />
              ))}
              <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 999, background: "var(--bg)" }}>
                <div style={{ height: "100%", borderRadius: 999, width: `${duration ? (time / duration) * 100 : 0}%`, background: "linear-gradient(90deg,var(--primary-dim),var(--primary))" }} />
              </div>
              <span style={{ position: "absolute", left: `${duration ? (time / duration) * 100 : 0}%`, width: 13, height: 13, borderRadius: "50%", background: "var(--primary)", transform: "translateX(-50%)", boxShadow: "0 0 0 3px rgba(163,230,53,0.2)", pointerEvents: "none" }} />
              {bookmarks.map((b) => (
                <span key={b.id} title={b.label || ""} onClick={(e) => { e.stopPropagation(); seek(b.t); }} style={{ position: "absolute", top: -11, left: `${duration ? (b.t / duration) * 100 : 0}%`, transform: "translateX(-50%)", color: "var(--primary)", fontSize: 13, cursor: "pointer" }}>★</span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, gap: 10 }}>
              <span className="dim" style={{ fontSize: 11.5, fontFamily: "monospace" }}>{fmt(time)} / {fmt(duration)}</span>
              <span className="dim" style={{ fontSize: 11 }}>{analysis ? `${analysis.detections.length} ball detections` : "space play · ←/→ seek · , . frame-step"}</span>
            </div>
          </div>

          {/* controls — playback (left) split from tools (right) */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button className="iconbtn" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "❚❚" : "▶"}</button>
            <button className="iconbtn" onClick={() => seek(Math.max(0, time - 5))} title="Back 5 seconds" aria-label="Back 5 seconds" style={{ width: "auto", padding: "0 10px", fontSize: 12 }}>«5s</button>
            <button className="iconbtn" onClick={() => seek(Math.min(duration, time + 5))} title="Forward 5 seconds" aria-label="Forward 5 seconds" style={{ width: "auto", padding: "0 10px", fontSize: 12 }}>5s»</button>
            <span style={{ flex: 1 }} />
            <button className={"iconbtn" + (drawMode ? " on" : "")} onClick={() => setDrawMode((d) => !d)} title="Draw on the frame" aria-label="Draw on the frame">✎</button>
            {drawMode && <button className="iconbtn" onClick={clearDraw} title="Clear drawing" aria-label="Clear drawing">⌫</button>}
            <button className="iconbtn" onClick={addBookmark} title="Bookmark this moment" aria-label="Bookmark this moment">★</button>
            <button
              className={"btn btn-sm" + (calibrating ? " btn-indigo" : "")}
              onClick={calibrating ? () => setCalibrating(false) : startCalibration}
              title="Mark the 4 court corners so in/out is accurate"
            >
              {calibrating ? "Cancel" : corners.length === 4 ? "⊹ Recalibrate" : "⊹ Calibrate court"}
            </button>
          </div>
          {corners.length === 4 && (
            <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>
              ✓ Court calibrated — re-run ball detection for accurate in/out.
            </div>
          )}
        </div>
      </div>

      {!analysis && !shot && !track && (
        <div className="card" style={{ marginTop: 18, borderColor: "rgba(163,230,53,0.3)", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700 }}>🎾 Get started</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Run the AI tools in the tabs below to get your coaching read, ball map and shot insights.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="chip" onClick={() => setActiveTab("insights")} style={{ cursor: "pointer" }}>1 · Analyze shots</span>
            <span className="chip" onClick={() => setActiveTab("trajectories")} style={{ cursor: "pointer" }}>2 · Map the ball</span>
          </div>
        </div>
      )}

      <div className="tabs" style={{ marginTop: 18, display: "inline-flex", flexWrap: "wrap" }}>
        {([["insights", "Insights"], ["shots", "Shots"], ["trajectories", "Trajectories"], ["rallies", "Rallies"], ["bookmarks", "Bookmarks"]] as const).map(([k, label]) => (
          <button key={k} className={"tab" + (activeTab === k ? " active" : "")} onClick={() => setActiveTab(k)}>{label}</button>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        {activeTab === "bookmarks" && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>Bookmarks</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Saved moments — click to jump.</div>
            {bookmarks.length === 0 ? (
              <div className="dim" style={{ fontSize: 13 }}>No bookmarks yet — tap ★ during a rally to mark the moment.</div>
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
        )}
        {activeTab === "shots" && (
          <div className="card" style={{ borderColor: "rgba(163,230,53,0.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title">Ball detection</div>
              <span className="badge badge-average" style={{ fontSize: 11 }}>beta</span>
            </div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
              Finds and maps every ball position on the court using AI.
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 12, opacity: analyzing || !videoUrl ? 0.6 : 1 }}
              onClick={runAnalysis}
              disabled={analyzing || !videoUrl}
            >
              {analyzing ? "Analyzing… (up to a minute)" : analysis ? "↻ Re-analyze" : "▶ Analyze ball positions"}
            </button>

            {analysisError && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--poor)" }}>{analysisError}</div>
            )}

            {analysis && (() => {
              const inN = analysis.detections.filter((d) => d.inOut === "in").length;
              const outN = analysis.detections.filter((d) => d.inOut === "out").length;
              const calibd = inN + outN > 0;
              const inPct = calibd ? Math.round((100 * inN) / (inN + outN)) : 0;
              return (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Metric label="Balls tracked" value={String(analysis.detectionsFound)} />
                    {calibd
                      ? <Metric label="In bounds" value={`${inPct}%`} />
                      : <Metric label="Video length" value={`${analysis.duration.toFixed(1)}s`} />}
                  </div>
                  {calibd && (
                    <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 13, alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 16, borderTop: "2px solid var(--excellent)" }} /><b style={{ color: "var(--excellent)" }}>{inN}</b> in</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 16, borderTop: "2px dashed var(--poor)" }} /><b style={{ color: "var(--poor)" }}>{outN}</b> out</span>
                    </div>
                  )}
                  <div className="dim" style={{ fontSize: 11.5, margin: "12px 0 6px" }}>
                    Where the ball went on the court
                  </div>
                  <CourtScatter detections={analysis.detections} />
                  <p className="dim" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
                    {corners.length === 4
                      ? "In/out uses your court calibration."
                      : "Tip: use “⊹ Calibrate court”, then re-analyze for accurate in/out."}
                  </p>
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>Detection details</summary>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <Metric label="Video length" value={`${analysis.duration.toFixed(1)}s`} />
                      <Metric label="Frames scanned" value={String(analysis.totalFrames)} />
                      <Metric label="Source FPS" value={analysis.fps.toFixed(0)} />
                    </div>
                  </details>
                </div>
              );
            })()}
          </div>
        )}
        {activeTab === "insights" && (
          <div className="card" style={{ borderColor: "rgba(129,140,248,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="section-title">AI Shot Breakdown</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              Gemini reviews keyframes from your match and returns a coaching read.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="badge badge-average" style={{ fontSize: 11 }}>beta</span>
            <button
              className="btn btn-indigo btn-sm"
              onClick={runShotAnalysis}
              disabled={shotBusy || !videoUrl}
              style={{ opacity: shotBusy || !videoUrl ? 0.6 : 1 }}
            >
              {shotBusy ? "Analyzing… (up to a minute)" : shot ? "↻ Re-run" : "✦ Run AI shot breakdown"}
            </button>
          </div>
        </div>

        {shotError && <div style={{ marginTop: 10, fontSize: 13, color: "var(--poor)" }}>{shotError}</div>}

        {shot?.analysis && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14.5, lineHeight: 1.6 }}>{shot.analysis.summary}</p>

            {(shot.analysis.kitchenControl != null || shot.analysis.positioning) && (
              <div className="grid" style={{ gridTemplateColumns: shot.analysis.kitchenControl != null ? "200px 1fr" : "1fr", gap: 16, marginTop: 14, alignItems: "center" }}>
                {shot.analysis.kitchenControl != null && (
                  <div>
                    <div className="dim" style={{ fontSize: 12, marginBottom: 4 }}>Kitchen (NVZ) control</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="progress" style={{ flex: 1 }}>
                        <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, shot.analysis.kitchenControl))}%` }} />
                      </div>
                      <b style={{ fontSize: 14 }}>{shot.analysis.kitchenControl}%</b>
                    </div>
                  </div>
                )}
                {shot.analysis.positioning && (
                  <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{shot.analysis.positioning}</div>
                )}
              </div>
            )}

            {shot.analysis.shotTypes && shot.analysis.shotTypes.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="dim" style={{ fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Shot mix</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {shot.analysis.shotTypes.map((s, i) => (
                    <span key={i} className="chip" style={{ borderColor: emphasisColor(s.emphasis) }}>
                      {s.type}
                      <span style={{ color: emphasisColor(s.emphasis), fontWeight: 700, marginLeft: 5 }}>{s.emphasis}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16, gap: 18 }}>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Skill read · DUPR scale (AI est.)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {shot.analysis.ratings &&
                    Object.entries(shot.analysis.ratings).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span style={{ textTransform: "capitalize" }}>{k}</span>
                          <b>{Number(v).toFixed(1)}</b>
                        </div>
                        <div className="progress">
                          <div className="progress-bar" style={{ width: `${(Number(v) / 8) * 100}%`, background: "linear-gradient(90deg,var(--indigo-dim),var(--indigo))" }} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Shots observed</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(shot.analysis.shotsObserved || []).map((s, i) => (
                    <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px" }}>
                      <span className="chip" style={{ padding: "2px 9px", fontSize: 12 }}>{s.type}</span>
                      <span className="muted" style={{ fontSize: 12.5, marginLeft: 8 }}>{s.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16, gap: 18 }}>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--excellent)" }}>Strengths</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
                  {(shot.analysis.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--average)" }}>Work on</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
                  {(shot.analysis.improvements || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            {shot.analysis.coachTip && (
              <div style={{ marginTop: 16, background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ fontWeight: 700, color: "var(--indigo)" }}>Coach tip · </span>
                <span style={{ fontSize: 14 }}>{shot.analysis.coachTip}</span>
              </div>
            )}

            <p className="dim" style={{ fontSize: 11, marginTop: 12 }}>
              {shot.model} · {shot.framesAnalyzed} keyframes · AI estimate from sparse frames, not exact stats.
            </p>
          </div>
        )}
          </div>
        )}
        {activeTab === "trajectories" && (
          <div className="card" style={{ borderColor: "rgba(163,230,53,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="section-title">Ball Trajectories (3D)</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              Ball positions mapped onto the court — a quick 20-second window, or the
              entire match (≈1–2 min, uses ~1 Roboflow credit; result is saved).
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="badge badge-average" style={{ fontSize: 11 }}>beta</span>
            <button className="btn btn-sm" onClick={() => runTracking(false)} disabled={tracking || !videoUrl} style={{ opacity: tracking || !videoUrl ? 0.6 : 1 }}>
              {tracking ? "Tracking…" : `▶ Track 20s from ${fmt(time)}`}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => runTracking(true)} disabled={tracking || !videoUrl} style={{ opacity: tracking || !videoUrl ? 0.6 : 1 }}>
              {tracking ? "Tracking…" : "▶ Track full video"}
            </button>
            {pushSupported() && (
              <button className="btn btn-sm" title="Get a notification when a full-match analysis finishes" onClick={async () => { if (!pushOn) setPushOn(await enablePush(supabase)); }}>
                {pushOn ? "🔔 Alerts on" : "🔔 Notify me"}
              </button>
            )}
          </div>
        </div>

        {tracking && (
          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            <span className="ball-spin" style={{ marginRight: 8 }} />
            Tracking… a full match can take ~1–2 minutes — you can keep using the page.
          </div>
        )}
        {trackError && <div style={{ marginTop: 10, fontSize: 13, color: "var(--poor)" }}>{trackError}</div>}

        {track && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <div className="tabs">
                {(["3d", "top", "side"] as const).map((v) => (
                  <button key={v} className={"tab" + (trackView === v ? " active" : "")} onClick={() => setTrackView(v)}>
                    {v === "3d" ? "3D" : v === "top" ? "Top" : "Side"}
                  </button>
                ))}
              </div>
              <span className="muted" style={{ fontSize: 13 }}>
                {track.trajectories.length} {track.fullVideo ? "rallies" : "shots"} · {track.pointsDetected} points
                {track.calibrated && (
                  <>
                    {" · "}
                    <b style={{ color: "var(--excellent)" }}>{track.trajectories.filter((t) => t.inOut === "in").length} in</b>
                    {" / "}
                    <b style={{ color: "var(--poor)" }}>{track.trajectories.filter((t) => t.inOut === "out").length} out</b>
                  </>
                )}
              </span>
            </div>
            <TrajectoryMap3D trajectories={track.trajectories} view={trackView} />
            <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 18, borderTop: "2px solid var(--excellent)" }} /><span className="muted">in</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 18, borderTop: "2px dashed var(--poor)" }} /><span className="muted">out</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 18, borderTop: "2px solid #94a3b8" }} /><span className="muted">not calibrated</span></span>
            </div>
            <p className="dim" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
              Detector: <b>{track.detector === "roboflow" ? "Roboflow trained model" : "color (blob)"}</b>.{" "}
              {track.calibrated ? "In/out uses your court calibration. " : "Calibrate the court for accurate in/out. "}
              Arc heights are physics-estimated — a single camera can&apos;t measure true 3D.
            </p>
          </div>
        )}
          </div>
        )}

        {activeTab === "rallies" && (
          <div className="card">
            <div className="section-title">Rallies &amp; highlights</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              Auto-detected from your full-match ball tracking — jump straight to the action and skip dead time.
            </div>
            {!(track && track.fullVideo) ? (
              <div style={{ marginTop: 14 }}>
                <div className="dim" style={{ fontSize: 13, marginBottom: 10 }}>
                  Run <b>Track full video</b> first (in the Trajectories tab) — rallies are detected from the full-match ball map.
                </div>
                <button className="btn btn-primary btn-sm" disabled={tracking || !videoUrl} onClick={() => { setActiveTab("trajectories"); runTracking(true); }}>
                  {tracking ? "Tracking…" : "▶ Track full video"}
                </button>
              </div>
            ) : (() => {
              const ra = analyzeRallies(track);
              return (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>
                    <Metric label="Rallies" value={String(ra.count)} />
                    <Metric label="Longest" value={`${ra.longest.toFixed(0)}s`} />
                    <Metric label="Avg length" value={`${ra.avgDuration.toFixed(1)}s`} />
                    <Metric label="Active play" value={`${Math.round(ra.activeSec)}s`} />
                  </div>
                  {ra.highlightIdx.length > 0 && (
                    <>
                      <div className="dim" style={{ fontSize: 12, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Highlights</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {ra.highlightIdx.map((idx) => {
                          const r = ra.rallies[idx];
                          return (
                            <button key={idx} className="btn btn-sm" onClick={() => seek(r.start)} style={{ borderColor: "var(--primary)" }}>
                              ▶ Rally {idx + 1} · {r.duration.toFixed(0)}s · ~{r.shots} shots
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <div className="dim" style={{ fontSize: 12, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>All rallies</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
                    {ra.rallies.map((r) => (
                      <div key={r.index} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px" }}>
                        <button onClick={() => seek(r.start)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>▶ {fmt(r.start)}</button>
                        <span className="muted" style={{ flex: 1, fontSize: 13 }}>Rally {r.index + 1} · {r.duration.toFixed(0)}s · ~{r.shots} shots</span>
                        {r.inOut && <span className={"badge " + (r.inOut === "in" ? "badge-excellent" : "badge-poor")} style={{ fontSize: 10 }}>{r.inOut}</span>}
                      </div>
                    ))}
                  </div>
                  <p className="dim" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                    Rally boundaries &amp; shot counts are approximate (from ball tracking). ~{Math.round(ra.deadSec)}s of dead time detected between points.
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function emphasisColor(e: string): string {
  const v = (e || "").toLowerCase();
  if (v.startsWith("high")) return "var(--excellent)";
  if (v.startsWith("low")) return "var(--text-dim)";
  return "var(--average)";
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
// A margin around the court lets out-of-bounds points show outside the lines.
function CourtScatter({
  detections,
}: {
  detections: { courtX: number; courtY: number; confidence: number; inOut?: string | null }[];
}) {
  const w = 220;
  const h = 380;
  const m = 26; // margin around the court for out-of-bounds points
  const cw = w - m * 2;
  const ch = h - m * 2;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const x = (ft: number) => clamp(m + (ft / 20) * cw, 3, w - 3);
  const y = (ft: number) => clamp(m + (ft / 44) * ch, 3, h - 3);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w }}>
      <rect x={m} y={m} width={cw} height={ch} fill="#16243f" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      {/* net at mid-court */}
      <line x1={m} y1={h / 2} x2={w - m} y2={h / 2} stroke="#fff" strokeWidth={2} />
      {/* kitchen lines (7ft each side of net) */}
      <line x1={m} y1={y(15)} x2={w - m} y2={y(15)} stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" />
      <line x1={m} y1={y(29)} x2={w - m} y2={y(29)} stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" />
      {detections.map((d, i) => {
        const fill = d.inOut === "in" ? "var(--excellent)" : d.inOut === "out" ? "var(--poor)" : "var(--primary)";
        return <circle key={i} cx={x(d.courtX)} cy={y(d.courtY)} r={3} fill={fill} opacity={0.4 + d.confidence * 0.5} />;
      })}
      {detections.length === 0 && (
        <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={11} fill="var(--text-dim)">No balls detected</text>
      )}
    </svg>
  );
}
