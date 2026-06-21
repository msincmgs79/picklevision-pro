import Link from "next/link";
import {
  matchSummary,
  qualityBreakdown,
  skillRatings,
  overallRating,
  highlights,
  shotTypeCounts,
} from "../lib/mockData";
import { Donut, HBars } from "../components/charts";

export default function Dashboard() {
  const donutData = [
    { label: "Excellent", value: qualityBreakdown.Excellent, color: "var(--excellent)" },
    { label: "Average", value: qualityBreakdown.Average, color: "var(--average)" },
    { label: "Poor", value: qualityBreakdown.Poor, color: "var(--poor)" },
  ];
  const topShots = [...shotTypeCounts].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Latest Match · {matchSummary.date}</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>
            {matchSummary.team} vs {matchSummary.opponent}
          </h1>
          <p className="page-sub">
            with {matchSummary.partner} · {matchSummary.score} ·{" "}
            <span style={{ color: "var(--excellent)", fontWeight: 700 }}>{matchSummary.result}</span>
          </p>
        </div>
        <Link href="/record" className="btn btn-primary">
          ● Record New Game
        </Link>
      </div>

      {/* stat tiles */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 26 }}>
        <Stat label="Overall Rating" value={overallRating.toFixed(1)} trend="+0.06 vs last" up />
        <Stat label="Total Shots" value={String(matchSummary.totalShots)} trend={`${matchSummary.rallies} rallies`} />
        <Stat label="Winners" value={String(matchSummary.winners)} trend={`${matchSummary.unforcedErrors} unforced errors`} up />
        <Stat label="Active Play" value={matchSummary.activePlay} trend={`${matchSummary.deadTimeCut} dead time cut`} />
      </div>

      {/* feature cards */}
      <h2 className="section-title" style={{ marginTop: 34, marginBottom: 16 }}>
        Explore your game
      </h2>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <FeatureCard
          href="/analysis"
          icon="✦"
          title="Shot Explorer"
          desc="Every shot categorized & graded — serves, drops, dinks, Ernes, ATPs — with 3D trajectories, depth and heatmaps."
        />
        <FeatureCard
          href="/review"
          icon="▷"
          title="Video Review"
          desc="Auto-highlights, longest rallies, pattern explorer, filterable replays, plus draw & bookmark tools."
        />
        <FeatureCard
          href="/ratings"
          icon="★"
          title="Ratings & Team"
          desc="Per-skill ratings, doubles team stats, AI-chat export and DUPR sync to track competitive progress."
        />
      </div>

      {/* analytics row */}
      <div className="grid" style={{ gridTemplateColumns: "1.1fr 1fr 1fr", marginTop: 18 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 4 }}>Shot Quality</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>AI grade across all shots</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Donut data={donutData} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {donutData.map((d) => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                  <span style={{ fontSize: 13.5 }}>
                    <b>{d.value}</b> <span className="muted">{d.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Top Shot Types</div>
          <HBars data={topShots.map((s) => ({ label: s.type, value: s.count }))} />
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Skill Snapshot</div>
          <HBars
            data={skillRatings.map((s) => ({ label: s.label, value: s.value }))}
            max={5}
          />
        </div>
      </div>

      {/* highlights preview */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 34, marginBottom: 16 }}>
        <h2 className="section-title">Auto Highlights</h2>
        <Link href="/review" className="btn btn-sm btn-ghost">View all →</Link>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {highlights.slice(0, 3).map((h) => (
          <Link key={h.id} href="/review" className="card" style={{ display: "block" }}>
            <div
              style={{
                height: 120,
                borderRadius: 10,
                background: "linear-gradient(135deg, #1d3357, #243b6b)",
                display: "grid",
                placeItems: "center",
                position: "relative",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 34, opacity: 0.85 }}>▶</div>
              <span className="badge" style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.4)" }}>
                {h.tag}
              </span>
              <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 12, color: "var(--text-muted)" }}>
                {h.duration}s · {h.rallyLen} shots
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{h.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, trend, up }: { label: string; value: string; trend?: string; up?: boolean }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {trend && <div className={"stat-trend " + (up ? "up" : "muted")}>{up ? "▲ " : ""}{trend}</div>}
    </div>
  );
}

function FeatureCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card" style={{ display: "block" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--surface-2)",
          display: "grid",
          placeItems: "center",
          fontSize: 20,
          color: "var(--primary)",
          marginBottom: 14,
        }}
      >
        {icon}
      </div>
      <div className="section-title">{title}</div>
      <p className="muted" style={{ fontSize: 13.5, marginTop: 7, lineHeight: 1.55 }}>
        {desc}
      </p>
      <div style={{ color: "var(--primary)", fontWeight: 700, fontSize: 13.5, marginTop: 12 }}>
        Open →
      </div>
    </Link>
  );
}
