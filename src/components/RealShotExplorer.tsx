"use client";

import Link from "next/link";
import { Heatmap } from "./charts";
import type { LatestAnalysis, BallDetection } from "../lib/analysis";

export default function RealShotExplorer({ real }: { real: LatestAnalysis }) {
  const ball = real.ball;
  const a = real.shot?.analysis;
  const shots = a?.shotsObserved || [];
  const grid = ball ? buildGrid(ball.detections) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">AI Analysis · {real.title}</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Shot Explorer</h1>
          <p className="page-sub">{real.team} vs {real.opponent} · computed from your match footage.</p>
        </div>
        <Link href={`/matches/${real.matchId}`} className="btn btn-sm btn-ghost">Open match →</Link>
      </div>

      {/* metrics */}
      {ball && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 22 }}>
          <Stat label="Ball positions" value={String(ball.detectionsFound)} />
          <Stat label="Footage analyzed" value={`${Math.round(ball.duration)}s`} />
          <Stat label="Frames scanned" value={String(ball.totalFrames)} />
          <Stat label="Source FPS" value={ball.fps.toFixed(0)} />
        </div>
      )}

      {a?.shotTypes && a.shotTypes.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>Shot Mix</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Shot types the AI saw emphasized</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {a.shotTypes.map((s, i) => (
              <span key={i} className="chip" style={{ borderColor: emph(s.emphasis) }}>
                {s.type}
                <b style={{ color: emph(s.emphasis), marginLeft: 5 }}>{s.emphasis}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 18, alignItems: "start" }}>
        {/* heatmap from real ball positions */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%" }}>
            <div className="section-title">Court Coverage</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Where the ball was detected</div>
          </div>
          {grid ? (
            <>
              <Heatmap grid={grid} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12 }} className="muted">
                Low
                <span style={{ width: 120, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#1e2950,#38bdf8,#a3e635,#fbbf24,#f87171)" }} />
                High
              </div>
            </>
          ) : (
            <EmptyHint
              text="Run Ball Detection on this match to see real court coverage."
              href={`/matches/${real.matchId}`}
            />
          )}
        </div>

        {/* shots observed (Gemini) */}
        <div className="card">
          <div className="section-title">Shots Observed</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Identified by AI from keyframes</div>
          {shots.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shots.map((s, i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px" }}>
                  <span className="chip" style={{ padding: "3px 11px" }}>{s.type}</span>
                  <span className="muted" style={{ fontSize: 13, marginLeft: 9 }}>{s.note}</span>
                </div>
              ))}
              {real.shot?.analysis?.summary && (
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 6 }}>
                  {real.shot.analysis.summary}
                </p>
              )}
            </div>
          ) : (
            <EmptyHint
              text="Run the AI Shot Breakdown on this match to identify shots."
              href={`/matches/${real.matchId}`}
            />
          )}
        </div>
      </div>

      {/* scatter of real positions */}
      {ball && ball.detections.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="section-title">Detected Ball Positions</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
            Each point is a frame where the ball was found.
          </div>
          <Scatter detections={ball.detections} />
        </div>
      )}

      <p className="dim" style={{ fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
        Court coverage comes from real color-based ball detection; shot labels &amp; ratings are AI estimates from sparse
        keyframes. Per-shot speed, depth and graded 3D trajectories aren&apos;t measured yet — those need deeper tracking.
      </p>
    </div>
  );
}

function buildGrid(dets: BallDetection[], rows = 12, cols = 8): number[][] {
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  let max = 0;
  for (const d of dets) {
    const r = Math.min(rows - 1, Math.max(0, Math.floor((d.courtY / 44) * rows)));
    const c = Math.min(cols - 1, Math.max(0, Math.floor((d.courtX / 20) * cols)));
    grid[r][c] += 1;
    if (grid[r][c] > max) max = grid[r][c];
  }
  return grid.map((row) => row.map((v) => (max ? v / max : 0)));
}

function emph(e: string): string {
  const v = (e || "").toLowerCase();
  if (v.startsWith("high")) return "var(--excellent)";
  if (v.startsWith("low")) return "var(--text-dim)";
  return "var(--average)";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 26 }}>{value}</div>
    </div>
  );
}

function EmptyHint({ text, href }: { text: string; href: string }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 12px" }}>
      <p className="muted" style={{ fontSize: 13.5 }}>{text}</p>
      <Link href={href} className="btn btn-sm btn-primary" style={{ marginTop: 10 }}>Open match →</Link>
    </div>
  );
}

function Scatter({ detections }: { detections: BallDetection[] }) {
  const w = 360;
  const h = 200;
  const pad = 8;
  // court is wider than tall here (landscape): x = width (20ft), y = length (44ft)
  const x = (ft: number) => pad + (Math.min(44, Math.max(0, ft)) / 44) * (w - pad * 2);
  const y = (ft: number) => pad + (Math.min(20, Math.max(0, ft)) / 20) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w }}>
      <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} fill="#16243f" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      <line x1={w / 2} y1={pad} x2={w / 2} y2={h - pad} stroke="#fff" strokeWidth={2} />
      {detections.map((d, i) => (
        <circle key={i} cx={x(d.courtY)} cy={y(d.courtX)} r={2.6} fill="var(--primary)" opacity={0.35 + d.confidence * 0.5} />
      ))}
    </svg>
  );
}
