"use client";

import { useState } from "react";
import Link from "next/link";
import { RadarChart, HBars } from "./charts";
import MatchSwitcher from "./MatchSwitcher";
import type { LatestAnalysis } from "../lib/analysis";

export default function RealRatings({ real }: { real: LatestAnalysis }) {
  const [copied, setCopied] = useState(false);
  const a = real.shot!.analysis;

  const ratingData = [
    { label: "Serve", value: num(a.ratings?.serve) },
    { label: "Return", value: num(a.ratings?.return) },
    { label: "Offense", value: num(a.ratings?.offense) },
    { label: "Defense", value: num(a.ratings?.defense) },
    { label: "Consistency", value: num(a.ratings?.consistency) },
  ];
  const overall = ratingData.reduce((s, r) => s + r.value, 0) / ratingData.length;
  const exportText = buildExport(real);

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  const aiTargets = [
    { name: "Claude", url: "https://claude.ai/new", color: "#d97757" },
    { name: "ChatGPT", url: "https://chat.openai.com/", color: "#10a37f" },
    { name: "Gemini", url: "https://gemini.google.com/app", color: "#4285f4" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">AI Analysis · {real.title}</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Ratings &amp; Insights</h1>
          <p className="page-sub">{real.team} vs {real.opponent} · graded by AI from your match footage.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <MatchSwitcher current={real.matchId} />
          <Link href={`/matches/${real.matchId}`} className="btn btn-sm btn-ghost">Open match →</Link>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 22, alignItems: "start" }}>
        {/* radar */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="section-title">Skill Ratings</div>
              <div className="dim" style={{ fontSize: 11.5, marginTop: 2 }}>AI estimate · DUPR scale (2–8)</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{overall.toFixed(1)}</div>
              <div className="dim" style={{ fontSize: 11.5 }}>AI DUPR est.</div>
            </div>
          </div>
          <RadarChart data={ratingData} max={8} />
          <div style={{ width: "100%", marginTop: 8 }}>
            <HBars data={ratingData} max={8} />
          </div>
        </div>

        {/* summary + strengths/work-on */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 6 }}>Coach summary</div>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{a.summary}</p>
            {a.kitchenControl != null && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span className="dim">Kitchen (NVZ) control</span>
                  <b>{a.kitchenControl}%</b>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, a.kitchenControl))}%` }} />
                </div>
              </div>
            )}
            {a.positioning && (
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 10 }}>{a.positioning}</p>
            )}
            {a.coachTip && (
              <div style={{ marginTop: 14, background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ fontWeight: 700, color: "var(--indigo)" }}>Coach tip · </span>
                <span style={{ fontSize: 14 }}>{a.coachTip}</span>
              </div>
            )}
          </div>
          <div className="card">
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--excellent)" }}>Strengths</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
                  {(a.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--average)" }}>Work on</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
                  {(a.improvements || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DUPR */}
      <div className="card" style={{ marginTop: 18, borderColor: "rgba(129,140,248,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="section-title">DUPR Integration</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Track your AI composite alongside your official rating</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="stat" style={{ minWidth: 150 }}>
              <div className="stat-label">AI estimate</div>
              <div className="stat-value" style={{ fontSize: 24 }}>{overall.toFixed(1)}</div>
              <div className="dim" style={{ fontSize: 11 }}>DUPR scale · not official</div>
            </div>
            <a className="btn btn-indigo btn-sm" href="https://dupr.com" target="_blank" rel="noreferrer">Open DUPR ↗</a>
          </div>
        </div>
      </div>

      {/* Discuss with AI — real export */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="section-title">Discuss with AI</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2, maxWidth: 520 }}>
              Copy this match&apos;s real analysis and paste it into any chatbot to dig deeper.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" onClick={copyExport}>
              {copied ? "✓ Copied!" : "⧉ Copy match data"}
            </button>
            {aiTargets.map((t) => (
              <a key={t.name} className="btn btn-sm" href={t.url} target="_blank" rel="noreferrer" style={{ borderColor: t.color }}>
                {t.name} ↗
              </a>
            ))}
          </div>
        </div>
        <pre
          style={{
            marginTop: 16, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10,
            padding: 16, fontSize: 12.5, color: "var(--text-muted)", overflowX: "auto", maxHeight: 260,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", whiteSpace: "pre-wrap",
          }}
        >
          {exportText}
        </pre>
      </div>
    </div>
  );
}

function num(v: any): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function buildExport(real: LatestAnalysis): string {
  const a = real.shot?.analysis;
  const lines: string[] = [];
  lines.push("PICKLEVISION MATCH ANALYSIS");
  lines.push(`Match: ${real.title} — ${real.team} vs ${real.opponent}`);
  if (real.recordedAt) lines.push(`Date: ${real.recordedAt}`);
  if (real.shot) lines.push(`Analyzed by: ${real.shot.model} (${real.shot.framesAnalyzed} keyframes)`);
  lines.push("");
  if (a) {
    lines.push("SUMMARY");
    lines.push(a.summary);
    lines.push("");
    lines.push("SKILL RATINGS (AI estimate, DUPR scale 2-8)");
    Object.entries(a.ratings || {}).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
    lines.push("");
    lines.push("STRENGTHS");
    (a.strengths || []).forEach((s) => lines.push(`- ${s}`));
    lines.push("");
    lines.push("WORK ON");
    (a.improvements || []).forEach((s) => lines.push(`- ${s}`));
    lines.push("");
    lines.push(`COACH TIP: ${a.coachTip}`);
  }
  if (real.ball) {
    lines.push("");
    lines.push(`BALL DETECTION: ${real.ball.detectionsFound} ball positions over ${Math.round(real.ball.duration)}s of footage`);
  }
  lines.push("");
  lines.push("QUESTION FOR THE AI: Based on this match, what two drills would most improve my game, and why?");
  return lines.join("\n");
}
