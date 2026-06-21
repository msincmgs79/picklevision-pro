"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MatchSwitcher from "./MatchSwitcher";
import type { ReviewData, BallDetection } from "../lib/analysis";

export default function RealReview({ review }: { review: ReviewData }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(review.ball?.duration || 0);

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

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const moments = deriveMoments(review.ball?.detections || [], duration);
  const shots = review.shot?.analysis?.shotsObserved || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">AI Analysis · {review.title}</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Video Review</h1>
          <p className="page-sub">{review.team} vs {review.opponent} · jump to detected activity and saved moments.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <MatchSwitcher current={review.matchId} />
          <Link href={`/matches/${review.matchId}`} className="btn btn-sm">Draw &amp; bookmark →</Link>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 22, alignItems: "start" }}>
        {/* player */}
        <div className="card" style={{ padding: 14 }}>
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 9", background: "#05080f" }}>
            {review.videoUrl ? (
              <video ref={videoRef} src={review.videoUrl} playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-muted)" }}>Video unavailable</div>
            )}
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", padding: "5px 11px", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
              {fmt(time)} <span className="dim">/ {fmt(duration)}</span>
            </div>
          </div>

          {/* timeline with moment + bookmark markers */}
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
            {moments.map((m, i) => (
              <span key={"m" + i} title={`Activity (${m.count})`} onClick={() => seek(m.t)} style={{ position: "absolute", top: 2, left: `${duration ? (m.t / duration) * 100 : 0}%`, width: 3, height: 14, background: "var(--primary)", borderRadius: 2, cursor: "pointer" }} />
            ))}
            {review.bookmarks.map((b) => (
              <span key={b.id} title={b.label || ""} onClick={() => seek(b.t)} style={{ position: "absolute", top: -2, left: `${duration ? (b.t / duration) * 100 : 0}%`, transform: "translateX(-50%)", color: "var(--indigo)", fontSize: 13, cursor: "pointer" }}>★</span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" onClick={() => (videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause())}>▶ / ❚❚</button>
            <button className="btn btn-sm" onClick={() => seek(Math.max(0, time - 5))}>« 5s</button>
            <button className="btn btn-sm" onClick={() => seek(Math.min(duration, time + 5))}>5s »</button>
          </div>
        </div>

        {/* moments + bookmarks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>Activity Moments</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Busiest stretches from ball detection</div>
            {moments.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {moments.map((m, i) => (
                  <button key={i} onClick={() => seek(m.t)} style={btn}>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>{fmt(m.t)}</span>
                    <span className="muted" style={{ fontSize: 12.5 }}>{m.count} ball hits in this stretch</span>
                  </button>
                ))}
              </div>
            ) : (
              <Hint matchId={review.matchId} text="Run Ball Detection to surface activity moments." />
            )}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>Bookmarks</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Saved on the match page</div>
            {review.bookmarks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {review.bookmarks.map((b) => (
                  <button key={b.id} onClick={() => seek(b.t)} style={btn}>
                    <span style={{ fontWeight: 700, color: "var(--indigo)" }}>{fmt(b.t)}</span>
                    <span className="muted" style={{ fontSize: 12.5 }}>{b.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Hint matchId={review.matchId} text="No bookmarks yet — add them on the match page." />
            )}
          </div>
        </div>
      </div>

      {/* shots observed */}
      {shots.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>Shots the AI Spotted</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>From the Gemini keyframe analysis</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {shots.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px" }}>
                <span className="chip" style={{ padding: "3px 11px" }}>{s.type}</span>
                <span className="muted" style={{ fontSize: 13 }}>{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  textAlign: "left",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 9,
  padding: "9px 11px",
  cursor: "pointer",
  color: "var(--text)",
};

function Hint({ matchId, text }: { matchId: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "16px 8px" }}>
      <p className="muted" style={{ fontSize: 13 }}>{text}</p>
      <Link href={`/matches/${matchId}`} className="btn btn-sm btn-primary" style={{ marginTop: 8 }}>Open match →</Link>
    </div>
  );
}

// Group ball-detection timestamps into segments and surface the busiest ones.
function deriveMoments(dets: BallDetection[], duration: number): { t: number; count: number }[] {
  if (!dets.length || !duration) return [];
  const N = 14;
  const seg = duration / N;
  const counts = Array(N).fill(0);
  for (const d of dets) {
    const i = Math.min(N - 1, Math.max(0, Math.floor((d.timestamp || 0) / seg)));
    counts[i] += 1;
  }
  return counts
    .map((c, i) => ({ t: Math.round(i * seg), count: c }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .sort((a, b) => a.t - b.t);
}
