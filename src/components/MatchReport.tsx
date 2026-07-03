"use client";

import { isPlausibleBall } from "../lib/court";
import { analyzeRallies } from "../lib/rallies";
import type { InferenceResult, ShotAnalysisResult, TrackResult, PlayerCoverage } from "../lib/analysis";

// Self-contained, print-oriented coaching report. Rendered off-screen and
// captured to PDF (html2canvas + jsPDF). Uses explicit hex colors — not CSS
// vars — so html2canvas reproduces the palette exactly.
const C = {
  bg: "#0a0e1a",
  card: "#131a2b",
  panel: "#0e1626",
  border: "rgba(255,255,255,0.10)",
  text: "#e7edf7",
  muted: "#98a6be",
  dim: "#66748d",
  primary: "#a3e635",
  indigo: "#818cf8",
  excellent: "#34d399",
  average: "#fbbf24",
  poor: "#f87171",
};

function Section({ children, title, accent }: { children: React.ReactNode; title?: string; accent?: string }) {
  return (
    <div
      data-pdf-section
      style={{
        background: C.card,
        border: `1px solid ${accent || C.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 14,
      }}
    >
      {title && (
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12, letterSpacing: "-0.2px" }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 11px" }}>
      <div style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ color: color || C.text, fontSize: 19, fontWeight: 800, letterSpacing: "-0.5px", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

// Ball-position court plot (20ft x 44ft), explicit colors.
function ReportScatter({ detections }: { detections: { courtX: number; courtY: number; confidence: number; inOut?: string | null }[] }) {
  const w = 220, h = 380, m = 26;
  const cw = w - m * 2, ch = h - m * 2;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const x = (ft: number) => clamp(m + (ft / 20) * cw, 3, w - 3);
  const y = (ft: number) => clamp(m + (ft / 44) * ch, 3, h - 3);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <rect x={m} y={m} width={cw} height={ch} fill="#16243f" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
      <line x1={m} y1={h / 2} x2={w - m} y2={h / 2} stroke="#fff" strokeWidth={2} />
      <line x1={m} y1={y(15)} x2={w - m} y2={y(15)} stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" />
      <line x1={m} y1={y(29)} x2={w - m} y2={y(29)} stroke="rgba(255,255,255,0.45)" strokeDasharray="5 4" />
      {detections.map((d, i) => {
        const fill = d.inOut === "in" ? C.excellent : d.inOut === "out" ? C.poor : C.primary;
        return <circle key={i} cx={x(d.courtX)} cy={y(d.courtY)} r={3} fill={fill} opacity={0.4 + d.confidence * 0.5} />;
      })}
    </svg>
  );
}

// Player coverage heatmap, explicit colors.
function ReportCoverage({ grid, gw, gh }: { grid: number[][]; gw: number; gh: number }) {
  const w = 220, h = 380, m = 14;
  const cw = (w - m * 2) / gw, ch = (h - m * 2) / gh;
  const span = h - m * 2;
  let max = 1;
  for (const row of grid) for (const v of row) if (v > max) max = v;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <rect x={m} y={m} width={w - m * 2} height={span} fill="#0d1830" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
      {grid.map((row, gy) =>
        row.map((v, gx) =>
          v ? (
            <rect key={`${gx}-${gy}`} x={m + gx * cw} y={m + gy * ch} width={cw + 0.6} height={ch + 0.6} fill={C.primary} opacity={0.12 + 0.78 * (v / max)} />
          ) : null
        )
      )}
      <line x1={m} y1={h / 2} x2={w - m} y2={h / 2} stroke="#fff" strokeWidth={2} />
      <line x1={m} y1={m + (15 / 44) * span} x2={w - m} y2={m + (15 / 44) * span} stroke="rgba(255,255,255,0.4)" strokeDasharray="5 4" />
      <line x1={m} y1={m + (29 / 44) * span} x2={w - m} y2={m + (29 / 44) * span} stroke="rgba(255,255,255,0.4)" strokeDasharray="5 4" />
    </svg>
  );
}

export default function MatchReport({
  match,
  shot,
  analysis,
  players,
  track,
}: {
  match: any;
  shot: ShotAnalysisResult | null;
  analysis: InferenceResult | null;
  players: PlayerCoverage | null;
  track: TrackResult | null;
}) {
  const a = shot?.analysis;
  const dateStr = new Date(match.recorded_at || match.created_at || Date.now()).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Ball scatter: mirror the app's filtering (plausible when calibrated, else confidence gate).
  let dets: { courtX: number; courtY: number; confidence: number; inOut?: string | null }[] = [];
  let inN = 0, outN = 0, calibd = false;
  if (analysis) {
    calibd = analysis.detections.some((d) => d.inOut === "in" || d.inOut === "out");
    dets = calibd
      ? analysis.detections.filter((d) => isPlausibleBall(d))
      : analysis.detections.filter((d) => (d.confidence ?? 1) >= 0.2);
    inN = dets.filter((d) => d.inOut === "in").length;
    outN = dets.filter((d) => d.inOut === "out").length;
  }

  const ra = track?.fullVideo ? analyzeRallies(track) : null;

  return (
    <div style={{ width: 760, background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      {/* Header */}
      <div data-pdf-section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <img src="/logo.png" alt="" width={26} height={26} />
            <span style={{ fontWeight: 800, fontSize: 17 }}>
              Pickle<span style={{ color: C.primary }}>Vision</span>
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
            {match.title || "Match"}
            {match.result && (
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, color: match.result === "win" ? C.excellent : C.poor, background: match.result === "win" ? "rgba(52,211,153,0.14)" : "rgba(248,113,113,0.14)" }}>
                {match.result === "win" ? "WIN" : "LOSS"}
              </span>
            )}
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {[match.team, match.opponent].filter(Boolean).join(" vs ") || "—"}
            {match.score ? ` · ${match.score}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: C.primary, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>Coaching report</div>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>{dateStr}</div>
        </div>
      </div>

      {/* AI Shot Breakdown */}
      {a && (
        <Section title="AI shot breakdown" accent="rgba(129,140,248,0.4)">
          {a.summary && <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 14px", color: C.text }}>{a.summary}</p>}

          {a.ratings && Object.keys(a.ratings).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Skill read · DUPR scale (AI estimate)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                {Object.entries(a.ratings).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                      <span style={{ textTransform: "capitalize", color: C.muted }}>{k}</span>
                      <b>{Number(v).toFixed(1)}</b>
                    </div>
                    <div style={{ height: 7, background: C.panel, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(Number(v) / 8) * 100}%`, background: C.indigo, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {a.strengths && a.strengths.length > 0 && (
              <div>
                <div style={{ color: C.excellent, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Strengths</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.6, color: C.text }}>
                  {a.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {a.improvements && a.improvements.length > 0 && (
              <div>
                <div style={{ color: C.average, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Work on</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.6, color: C.text }}>
                  {a.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>

          {a.shotTypes && a.shotTypes.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Shot mix</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {a.shotTypes.map((s, i) => (
                  <span key={i} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 999, border: `1px solid ${C.border}`, background: C.panel }}>
                    {s.type} <b style={{ color: s.emphasis?.toLowerCase().startsWith("high") ? C.excellent : C.average }}>{s.emphasis}</b>
                  </span>
                ))}
              </div>
            </div>
          )}

          {a.coachTip && (
            <div style={{ marginTop: 14, background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.35)", borderRadius: 10, padding: "11px 13px", fontSize: 13 }}>
              <b style={{ color: C.indigo }}>Coach tip · </b>
              {a.coachTip}
            </div>
          )}

          <div style={{ color: C.dim, fontSize: 10.5, marginTop: 12 }}>
            {shot?.model} · {shot?.framesAnalyzed} keyframes · AI estimate from sparse frames, not exact stats.
          </div>
        </Section>
      )}

      {/* Ball map */}
      {analysis && (
        <Section title="Ball positions" accent="rgba(163,230,53,0.35)">
          <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
            <ReportScatter detections={dets} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Stat label="Balls tracked" value={String(analysis.detectionsFound)} />
                <Stat label={calibd ? "Mapped on court" : "Video length"} value={calibd ? String(dets.length) : `${analysis.duration.toFixed(1)}s`} />
                {calibd && <Stat label="In" value={String(inN)} color={C.excellent} />}
                {calibd && <Stat label="Out" value={String(outN)} color={C.poor} />}
              </div>
              <p style={{ color: C.dim, fontSize: 11, lineHeight: 1.5, marginTop: 10 }}>
                Each dot is a detected ball position on the court.
                {calibd ? " Green = in, red = out (approximate)." : " Calibrate the court for in/out calls."}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Player coverage */}
      {players && (
        <Section title="Player court coverage" accent="rgba(163,230,53,0.35)">
          <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
            <ReportCoverage grid={players.grid} gw={players.gw} gh={players.gh} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Stat label="Positions" value={String(players.detections)} />
                <Stat label="Near · at net" value={`${players.near.netPct}%`} />
                <Stat label="Far · at net" value={`${players.far.netPct}%`} />
              </div>
              <p style={{ color: C.dim, fontSize: 11, lineHeight: 1.5, marginTop: 10 }}>
                Brighter = more time spent there. &quot;At net&quot; is the share of a side&apos;s positions inside the kitchen (NVZ).
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Rallies */}
      {ra && (
        <Section title="Rallies & highlights" accent={C.border}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <Stat label="Rallies" value={String(ra.count)} />
            <Stat label="Longest" value={`${ra.longest.toFixed(0)}s`} />
            <Stat label="Avg length" value={`${ra.avgDuration.toFixed(1)}s`} />
            <Stat label="Active play" value={`${Math.round(ra.activeSec)}s`} />
          </div>
        </Section>
      )}

      {!a && !analysis && !players && (
        <Section>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            Run the AI shot breakdown and ball map on this match to generate a full coaching report.
          </p>
        </Section>
      )}

      {/* Footer */}
      <div data-pdf-section style={{ marginTop: 6, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", color: C.dim, fontSize: 10.5 }}>
        <span>Generated by PickleVision · AI pickleball analysis</span>
        <span>DUPR-scale ratings are AI estimates, not affiliated with DUPR.</span>
      </div>
    </div>
  );
}
