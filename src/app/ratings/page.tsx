"use client";

import { useState } from "react";
import {
  skillRatings,
  overallRating,
  teamStats,
  matchSummary,
  shotTypeCounts,
  qualityBreakdown,
} from "../../lib/mockData";
import { RadarChart, HBars } from "../../components/charts";

export default function RatingsPage() {
  const [copied, setCopied] = useState(false);

  const exportText = buildExport();

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
      <div className="eyebrow">Step 4 · Progress</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Ratings &amp; Team</h1>
      <p className="page-sub">Per-skill ratings, doubles team stats, AI chat export and DUPR sync.</p>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 22, alignItems: "start" }}>
        {/* skill radar */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-title">Individual Skill Ratings</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{overallRating.toFixed(1)}</div>
              <div className="dim" style={{ fontSize: 11.5 }}>overall</div>
            </div>
          </div>
          <RadarChart data={skillRatings} max={5} />
          <div style={{ width: "100%", marginTop: 8 }}>
            <HBars data={skillRatings.map((s) => ({ label: s.label, value: s.value }))} max={5} />
          </div>
        </div>

        {/* team stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>Team Stats — Doubles</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {matchSummary.team} (you &amp; {matchSummary.partner}) vs {matchSummary.opponent}
            </div>
            <Versus label="Kitchen arrival rate" you={teamStats.kitchenArrival} partner={teamStats.partnerKitchen} unit="%" />
            <Versus label="Share of shots taken" you={teamStats.yourShots} partner={teamStats.partnerShots} unit="%" />
            <Versus label="Unforced errors" you={teamStats.errorsYou} partner={teamStats.errorsPartner} unit="" lowerBetter />
            <hr className="divider" style={{ margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
              <span className="muted">Stacking executed correctly</span>
              <b>{teamStats.stacking}%</b>
            </div>
          </div>

          {/* DUPR */}
          <div className="card" style={{ borderColor: "rgba(129,140,248,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="section-title">DUPR Integration</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Sync AI stats with your official rating</div>
              </div>
              <span className="badge badge-excellent"><span className="badge-dot" />Connected</span>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div className="stat" style={{ flex: 1 }}>
                <div className="stat-label">DUPR Doubles</div>
                <div className="stat-value" style={{ fontSize: 26 }}>4.412</div>
                <div className="stat-trend up">▲ +0.06 last match</div>
              </div>
              <div className="stat" style={{ flex: 1 }}>
                <div className="stat-label">PickleVision AI</div>
                <div className="stat-value" style={{ fontSize: 26 }}>{overallRating.toFixed(1)}</div>
                <div className="dim" style={{ fontSize: 12 }}>composite skill</div>
              </div>
            </div>
            <a className="btn btn-indigo" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} href="https://dupr.com" target="_blank" rel="noreferrer">
              Open DUPR profile ↗
            </a>
          </div>
        </div>
      </div>

      {/* Discuss with AI */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="section-title">Discuss with AI</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2, maxWidth: 520 }}>
              Export your match data and paste it into any AI chatbot to ask about your performance or compare games.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" onClick={copyExport}>
              {copied ? "✓ Copied!" : "⧉ Copy match data"}
            </button>
            {aiTargets.map((a) => (
              <a key={a.name} className="btn btn-sm" href={a.url} target="_blank" rel="noreferrer" style={{ borderColor: a.color }}>
                {a.name} ↗
              </a>
            ))}
          </div>
        </div>
        <pre
          style={{
            marginTop: 16,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 16,
            fontSize: 12.5,
            color: "var(--text-muted)",
            overflowX: "auto",
            maxHeight: 240,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            whiteSpace: "pre-wrap",
          }}
        >
          {exportText}
        </pre>
      </div>
    </div>
  );
}

function Versus({ label, you, partner, unit, lowerBetter }: { label: string; you: number; partner: number; unit: string; lowerBetter?: boolean }) {
  const max = Math.max(you, partner, 1);
  const youBetter = lowerBetter ? you < partner : you > partner;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
        <span className="muted" style={{ fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, width: 50, color: youBetter ? "var(--primary)" : "var(--text)" }}>You {you}{unit}</span>
        <div style={{ flex: 1, display: "flex", gap: 3, height: 10 }}>
          <div style={{ flex: you / max, background: "var(--primary)", borderRadius: "5px 0 0 5px", minWidth: 4 }} />
          <div style={{ flex: partner / max, background: "var(--indigo)", borderRadius: "0 5px 5px 0", minWidth: 4 }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, width: 70, textAlign: "right", color: !youBetter ? "var(--indigo)" : "var(--text)" }}>
          {partner}{unit} Ptnr
        </span>
      </div>
    </div>
  );
}

function buildExport(): string {
  const top = [...shotTypeCounts].sort((a, b) => b.count - a.count).slice(0, 5).map((s) => `${s.type}: ${s.count}`).join(", ");
  return `PICKLEVISION MATCH EXPORT
Date: ${matchSummary.date} | Result: ${matchSummary.result} (${matchSummary.score})
Partner: ${matchSummary.partner} | Opponent: ${matchSummary.opponent}
Duration: ${matchSummary.duration} (active play ${matchSummary.activePlay})

SUMMARY
- Total shots: ${matchSummary.totalShots} across ${matchSummary.rallies} rallies
- Winners: ${matchSummary.winners} | Unforced errors: ${matchSummary.unforcedErrors}
- Shot quality: ${qualityBreakdown.Excellent} excellent / ${qualityBreakdown.Average} average / ${qualityBreakdown.Poor} poor

SKILL RATINGS (0-5)
${skillRatings.map((s) => `- ${s.label}: ${s.value}`).join("\n")}
Overall: ${overallRating}

TEAM (doubles)
- Kitchen arrival: you ${teamStats.kitchenArrival}% / partner ${teamStats.partnerKitchen}%
- Shot share: you ${teamStats.yourShots}% / partner ${teamStats.partnerShots}%

TOP SHOTS: ${top}

QUESTION FOR THE AI:
Based on this match, what are my top 2 weaknesses and a drill to fix each?`;
}
