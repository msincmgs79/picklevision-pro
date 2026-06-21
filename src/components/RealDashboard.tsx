import Link from "next/link";
import { HBars } from "./charts";
import MatchSwitcher from "./MatchSwitcher";
import type { LatestAnalysis } from "../lib/analysis";

export default function RealDashboard({ real }: { real: LatestAnalysis }) {
  const a = real.shot?.analysis;
  const ratings = a
    ? [
        { label: "Serve", value: num(a.ratings?.serve) },
        { label: "Return", value: num(a.ratings?.return) },
        { label: "Offense", value: num(a.ratings?.offense) },
        { label: "Defense", value: num(a.ratings?.defense) },
        { label: "Consistency", value: num(a.ratings?.consistency) },
      ]
    : [];
  const overall = ratings.length ? ratings.reduce((s, r) => s + r.value, 0) / ratings.length : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Latest analyzed match{real.recordedAt ? ` · ${real.recordedAt}` : ""}</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>{real.team} vs {real.opponent}</h1>
          <p className="page-sub">{real.title} · AI analysis of your footage</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <MatchSwitcher current={real.matchId} />
          <Link href={`/matches/${real.matchId}`} className="btn">Open match</Link>
          <Link href="/record" className="btn btn-primary">● Record New Game</Link>
        </div>
      </div>

      {/* real stat tiles */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 26 }}>
        <Stat label="Overall Rating" value={overall != null ? overall.toFixed(1) : "—"} sub={a ? "AI estimate · DUPR scale" : "run shot breakdown"} />
        <Stat label="Ball Positions" value={real.ball ? String(real.ball.detectionsFound) : "—"} sub={real.ball ? "detected on court" : "run ball detection"} />
        <Stat label="Footage Analyzed" value={real.ball ? `${Math.round(real.ball.duration)}s` : "—"} sub={real.ball ? `${real.ball.totalFrames} frames` : ""} />
        <Stat label="Shots Observed" value={a ? String(a.shotsObserved?.length ?? 0) : "—"} sub={a ? "by AI from keyframes" : ""} />
      </div>

      {/* feature cards */}
      <h2 className="section-title" style={{ marginTop: 34, marginBottom: 16 }}>Explore this match</h2>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <FeatureCard href="/analysis" icon="✦" title="Shot Explorer" desc="Real court-coverage heatmap from detected ball positions, plus the shots the AI spotted." />
        <FeatureCard href={`/matches/${real.matchId}`} icon="▷" title="Video Review" desc="Watch your footage with draw & bookmark tools, and re-run AI analysis." />
        <FeatureCard href="/ratings" icon="★" title="Ratings & Insights" desc="Per-skill AI ratings, coaching summary, strengths and what to work on." />
      </div>

      {/* analytics row */}
      <div className="grid" style={{ gridTemplateColumns: a ? "1fr 1.3fr" : "1fr", marginTop: 18, alignItems: "start" }}>
        {ratings.length > 0 && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="section-title">Skill Snapshot</div>
              {overall != null && <span style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>{overall.toFixed(1)}</span>}
            </div>
            <HBars data={ratings} max={8} />
          </div>
        )}

        {a && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 8 }}>Coach Summary</div>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{a.summary}</p>
            {a.coachTip && (
              <div style={{ marginTop: 14, background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.3)", borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ fontWeight: 700, color: "var(--indigo)" }}>Coach tip · </span>
                <span style={{ fontSize: 14 }}>{a.coachTip}</span>
              </div>
            )}
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 16 }}>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--excellent)" }}>Strengths</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                  {(a.strengths || []).slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--average)" }}>Work on</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                  {(a.improvements || []).slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {!a && (
        <div className="card" style={{ marginTop: 18, borderColor: "rgba(129,140,248,0.35)" }}>
          <div className="section-title">Get your AI coaching read</div>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
            Run the AI Shot Breakdown on this match to see skill ratings, a coach summary and what to work on.
          </p>
          <Link href={`/matches/${real.matchId}`} className="btn btn-indigo btn-sm" style={{ marginTop: 12 }}>Open match →</Link>
        </div>
      )}
    </div>
  );
}

function num(v: any): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FeatureCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card" style={{ display: "block" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface-2)", display: "grid", placeItems: "center", fontSize: 20, color: "var(--primary)", marginBottom: 14 }}>
        {icon}
      </div>
      <div className="section-title">{title}</div>
      <p className="muted" style={{ fontSize: 13.5, marginTop: 7, lineHeight: 1.55 }}>{desc}</p>
      <div style={{ color: "var(--primary)", fontWeight: 700, fontSize: 13.5, marginTop: 12 }}>Open →</div>
    </Link>
  );
}
