"use client";

import { useEffect, useRef, useState } from "react";
import { highlights, patterns, replayFilters } from "../../lib/mockData";

const DURATION = 472; // seconds (match length)

export default function ReviewPage() {
  const [time, setTime] = useState(96);
  const [playing, setPlaying] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [bookmarks, setBookmarks] = useState<{ t: number; label: string }[]>([
    { t: 188, label: "3rd shot drop" },
    { t: 412, label: "Longest rally" },
  ]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const rafRef = useRef<number | null>(null);

  // playback loop
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => {
        const nt = t + dt;
        return nt >= DURATION ? 0 : nt;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  // drawing handlers
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
  function up() {
    drawing.current = false;
  }
  function clearDraw() {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }

  function addBookmark() {
    setBookmarks((b) => [...b, { t: Math.round(time), label: `Mark @ ${fmt(time)}` }].sort((a, z) => a.t - z.t));
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const ballX = 20 + 60 * Math.sin(time * 1.6);
  const ballY = 30 + 18 * Math.abs(Math.cos(time * 1.6));

  return (
    <div>
      <div className="eyebrow">Step 3 · Review</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Video Review</h1>
      <p className="page-sub">Auto-highlights, pattern explorer and filterable replays — with draw &amp; bookmark tools built in.</p>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 22, alignItems: "start" }}>
        {/* player */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 9", background: "linear-gradient(160deg,#0d1830,#16294a)" }}>
            {/* simulated court scene */}
            <svg viewBox="0 0 160 90" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <polygon points="48,28 112,28 144,82 16,82" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
              <line x1="38" y1="46" x2="122" y2="46" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
              <line x1="80" y1="28" x2="80" y2="82" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
              <circle cx={80 + ballX - 50} cy={ballY + 20} r="2.2" fill="#a3e635" />
            </svg>

            {/* draw canvas overlay */}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerLeave={up}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: drawMode ? "crosshair" : "default", touchAction: "none" }}
            />

            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", padding: "5px 11px", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
              {fmt(time)} <span className="dim">/ {fmt(DURATION)}</span>
            </div>
            {drawMode && (
              <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(163,230,53,0.2)", color: "var(--primary)", padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                ✎ Draw mode
              </div>
            )}
          </div>

          {/* timeline */}
          <div style={{ position: "relative", marginTop: 14, height: 30 }}>
            <div
              className="progress"
              style={{ height: 8, cursor: "pointer", marginTop: 6 }}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setTime(((e.clientX - r.left) / r.width) * DURATION);
              }}
            >
              <div className="progress-bar" style={{ width: `${(time / DURATION) * 100}%` }} />
            </div>
            {highlights.map((h) => (
              <span key={"h" + h.id} title={h.title} style={{ position: "absolute", top: 2, left: `${(h.t / DURATION) * 100}%`, width: 3, height: 16, background: "var(--indigo)", borderRadius: 2 }} />
            ))}
            {bookmarks.map((b, i) => (
              <span key={"b" + i} title={b.label} style={{ position: "absolute", top: 0, left: `${(b.t / DURATION) * 100}%`, transform: "translateX(-50%)", color: "var(--primary)", fontSize: 13 }}>
                ★
              </span>
            ))}
          </div>

          {/* controls */}
          <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-primary btn-sm" onClick={() => setPlaying((p) => !p)}>
              {playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <button className="btn btn-sm" onClick={() => setTime((t) => Math.max(0, t - 5))}>« 5s</button>
            <button className="btn btn-sm" onClick={() => setTime((t) => Math.min(DURATION, t + 5))}>5s »</button>
            <span style={{ flex: 1 }} />
            <button className={"btn btn-sm" + (drawMode ? " btn-indigo" : "")} onClick={() => setDrawMode((d) => !d)}>✎ Draw</button>
            <button className="btn btn-sm btn-ghost" onClick={clearDraw}>Clear</button>
            <button className="btn btn-sm" onClick={addBookmark}>★ Bookmark</button>
          </div>
        </div>

        {/* highlights */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 4 }}>Auto Highlights</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>AI-stitched reel & longest rallies</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, maxHeight: 420, overflowY: "auto" }}>
            {highlights.map((h) => (
              <button
                key={h.id}
                onClick={() => setTime(h.t)}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  textAlign: "left",
                  background: Math.abs(time - h.t) < h.duration ? "var(--surface-2)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 10,
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                <span style={{ width: 54, height: 38, borderRadius: 7, background: "linear-gradient(135deg,#1d3357,#243b6b)", display: "grid", placeItems: "center", flexShrink: 0 }}>▶</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</span>
                  <span className="dim" style={{ fontSize: 12 }}>{fmt(h.t)} · {h.tag}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* filterable replays */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-title" style={{ marginBottom: 4 }}>Filterable Replays</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Jump straight to specific events — e.g. “show me all my backhand dink errors.”
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {replayFilters.map((f) => (
            <button key={f} className={"chip" + (activeFilter === f ? " active" : "")} onClick={() => setActiveFilter(activeFilter === f ? null : f)}>
              {f}
            </button>
          ))}
        </div>
        {activeFilter && (
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <button
                key={i}
                onClick={() => setTime((i * 83) % DURATION)}
                style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--bg-2)", color: "var(--text)", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 130, height: 74, borderRadius: 7, background: "linear-gradient(135deg,#1d3357,#243b6b)", display: "grid", placeItems: "center", marginBottom: 8 }}>▶</div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{activeFilter}</div>
                <div className="dim" style={{ fontSize: 11.5 }}>Clip {i} · {fmt((i * 83) % DURATION)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* pattern explorer */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-title" style={{ marginBottom: 4 }}>Pattern Explorer</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Which shot sequences win you points — and which cost them.
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {patterns.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
                {p.sequence.map((step, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="chip" style={{ padding: "4px 10px" }}>{step}</span>
                    {i < p.sequence.length - 1 && <span className="dim">→</span>}
                  </span>
                ))}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: p.winRate >= 60 ? "var(--excellent)" : p.winRate >= 45 ? "var(--average)" : "var(--poor)" }}>
                  {p.winRate}%
                </div>
                <div className="dim" style={{ fontSize: 11.5 }}>{p.count}× · win rate</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
