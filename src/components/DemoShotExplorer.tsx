"use client";

import { useMemo, useState } from "react";
import {
  shots,
  shotTypeCounts,
  thirdShotBreakdown,
  depthStats,
  heatmap,
  movement,
  qualityBadgeClass,
  type ShotType,
  type Quality,
} from "../lib/mockData";
import {
  TrajectoryMap,
  DepthCourt,
  Heatmap,
  Donut,
  HBars,
} from "./charts";

const TABS = ["Shot Explorer", "3D Trajectories", "Serve & Return Depth", "3rd Shot", "Heatmap"] as const;
type Tab = (typeof TABS)[number];

const ALL_TYPES: (ShotType | "All")[] = ["All", "Serve", "Return", "Drive", "Drop", "Lob", "Smash", "Dink", "Erne", "ATP"];
const QUALITIES: (Quality | "All")[] = ["All", "Excellent", "Average", "Poor"];

export default function DemoShotExplorer() {
  const [tab, setTab] = useState<Tab>("Shot Explorer");
  const [typeFilter, setTypeFilter] = useState<ShotType | "All">("All");
  const [qualityFilter, setQualityFilter] = useState<Quality | "All">("All");
  const [playerFilter, setPlayerFilter] = useState<"All" | "You" | "Partner">("All");

  const filtered = useMemo(
    () =>
      shots.filter(
        (s) =>
          (typeFilter === "All" || s.type === typeFilter) &&
          (qualityFilter === "All" || s.quality === qualityFilter) &&
          (playerFilter === "All" || s.player === playerFilter)
      ),
    [typeFilter, qualityFilter, playerFilter]
  );

  return (
    <div>
      <div className="eyebrow">Analyze · demo</div>
      <h1 className="page-title" style={{ marginTop: 6 }}>Shot Explorer</h1>
      <p className="page-sub">
        Every shot the AI detected — categorized, graded and mapped. {shots.length} shots across 28 rallies.
      </p>

      <div className="tabs" style={{ marginTop: 22, width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>
        {TABS.map((t) => (
          <button key={t} className={"tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Shot Explorer" && (
        <div style={{ marginTop: 20 }}>
          {/* filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {ALL_TYPES.map((t) => (
              <button key={t} className={"chip" + (typeFilter === t ? " active" : "")} onClick={() => setTypeFilter(t)}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {QUALITIES.map((q) => (
              <button key={q} className={"chip" + (qualityFilter === q ? " active" : "")} onClick={() => setQualityFilter(q)}>
                {q}
              </button>
            ))}
            <span style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
            {(["All", "You", "Partner"] as const).map((p) => (
              <button key={p} className={"chip" + (playerFilter === p ? " active" : "")} onClick={() => setPlayerFilter(p)}>
                {p}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ maxHeight: 460, overflowY: "auto" }}>
              <table>
                <thead style={{ position: "sticky", top: 0, background: "var(--surface)" }}>
                  <tr>
                    <th>#</th>
                    <th>Rally</th>
                    <th>Shot</th>
                    <th>Player</th>
                    <th>Hand</th>
                    <th>Speed</th>
                    <th>Depth</th>
                    <th>Result</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td className="dim">{s.id}</td>
                      <td>R{s.rally}</td>
                      <td style={{ fontWeight: 600 }}>{s.type}</td>
                      <td>{s.player}</td>
                      <td className="muted">{s.hand}</td>
                      <td>{s.speedMph} mph</td>
                      <td>{s.depthFt} ft</td>
                      <td>
                        <span style={{ color: s.result === "In" ? "var(--excellent)" : s.result === "Net" ? "var(--average)" : "var(--poor)", fontWeight: 600 }}>
                          {s.result}
                        </span>
                      </td>
                      <td>
                        <span className={"badge " + qualityBadgeClass(s.quality)}>
                          <span className="badge-dot" />
                          {s.quality}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            Showing {filtered.length} of {shots.length} shots
          </div>
        </div>
      )}

      {tab === "3D Trajectories" && (
        <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", marginTop: 20, alignItems: "start" }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>3D Trajectory Map</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Arc, speed and placement of {typeFilter === "All" ? "every shot" : typeFilter + "s"}. Colored by AI grade.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
              {ALL_TYPES.map((t) => (
                <button key={t} className={"chip" + (typeFilter === t ? " active" : "")} onClick={() => setTypeFilter(t)}>
                  {t}
                </button>
              ))}
            </div>
            <TrajectoryMap shots={shots} highlightType={typeFilter === "All" ? undefined : typeFilter} />
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <Legend color="var(--excellent)" label="Excellent" />
              <Legend color="var(--average)" label="Average" />
              <Legend color="var(--poor)" label="Poor" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 14 }}>Avg speed by shot</div>
              <HBars
                data={shotTypeCounts
                  .map((c) => ({
                    label: c.type,
                    value: Math.round(
                      shots.filter((s) => s.type === c.type).reduce((a, b) => a + b.speedMph, 0) /
                        Math.max(1, c.count)
                    ),
                  }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 6)}
                unit=" mph"
              />
            </div>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 6 }}>Shot quality rate</div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>% graded Excellent</div>
              <HBars data={shotTypeCounts.filter((c) => c.count > 1).map((c) => ({ label: c.type, value: c.quality }))} max={100} unit="%" />
            </div>
          </div>
        </div>
      )}

      {tab === "Serve & Return Depth" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1.4fr", marginTop: 20, alignItems: "start" }}>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 4 }}>Depth on opponent court</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>How deep your serves & returns land</div>
            <DepthCourt serveDepth={depthStats.serveAvgDepth} returnDepth={depthStats.returnAvgDepth} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Mini label="Avg Serve Depth" value={`${depthStats.serveAvgDepth} ft`} sub={`${depthStats.serveSpeed} mph avg`} />
              <Mini label="Avg Return Depth" value={`${depthStats.returnAvgDepth} ft`} sub={`${depthStats.returnSpeed} mph avg`} />
              <Mini label="Serves In" value={`${depthStats.serveIn}%`} sub="net / out tracked" />
              <Mini label="Returns In" value={`${depthStats.returnIn}%`} sub={`${depthStats.faults} faults total`} />
            </div>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 6 }}>Coaching note</div>
              <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                Your serves average <b style={{ color: "var(--text)" }}>{depthStats.serveAvgDepth} ft</b> deep —
                strong. Returns sit a touch short at {depthStats.returnAvgDepth} ft; pushing them 2–3 ft deeper would
                keep opponents off the kitchen line and buy time for your third-shot drop.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "3rd Shot" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1.3fr", marginTop: 20, alignItems: "start" }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="section-title" style={{ marginBottom: 14, alignSelf: "flex-start" }}>3rd Shot Breakdown</div>
            <Donut data={thirdShotBreakdown} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16, justifyContent: "center" }}>
              {thirdShotBreakdown.map((d) => (
                <Legend key={d.label} color={d.color} label={`${d.label} (${d.value})`} />
              ))}
            </div>
          </div>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 6 }}>Transition game</div>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
              Your third shots break down into drops, drives, hybrids and lobs. A drop-heavy mix favors a patient,
              kitchen-control style; mixing in more drives can pressure opponents who crowd the line.
            </p>
            <HBars data={thirdShotBreakdown.map((d) => ({ label: d.label, value: d.value, color: d.color }))} />
            <hr className="divider" style={{ margin: "18px 0" }} />
            <div style={{ display: "flex", gap: 24 }}>
              <Mini label="Drop success" value="73%" sub="reached kitchen" inline />
              <Mini label="Drive success" value="58%" sub="won the point" inline />
            </div>
          </div>
        </div>
      )}

      {tab === "Heatmap" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1.3fr", marginTop: 20, alignItems: "start" }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="section-title" style={{ marginBottom: 4, alignSelf: "flex-start" }}>Court Coverage</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 14, alignSelf: "flex-start" }}>Where you spent your time</div>
            <Heatmap grid={heatmap} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12 }} className="muted">
              Low
              <span style={{ width: 120, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#1e2950,#38bdf8,#a3e635,#fbbf24,#f87171)" }} />
              High
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Mini label="Distance covered" value={`${movement.distanceFt} ft`} sub="this match" />
              <Mini label="Movement efficiency" value={`${movement.efficiency}%`} sub="vs ideal positioning" />
              <Mini label="Left-side points won" value={`${movement.leftSideWin}%`} sub="stronger side" />
              <Mini label="Right-side points won" value={`${movement.rightSideWin}%`} sub="room to improve" />
            </div>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 6 }}>Positioning insight</div>
              <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                You hold the kitchen line well and win <b style={{ color: "var(--excellent)" }}>{movement.leftSideWin}%</b> of
                left-side points. The cooler right-side zone suggests backhand dinks are leaking points — filter those
                replays in Video Review to see the pattern.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }} className="muted">
      <span style={{ width: 11, height: 11, borderRadius: 3, background: color }} />
      {label}
    </div>
  );
}

function Mini({ label, value, sub, inline }: { label: string; value: string; sub?: string; inline?: boolean }) {
  if (inline)
    return (
      <div>
        <div className="stat-value" style={{ fontSize: 24 }}>{value}</div>
        <div className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>
        {sub && <div className="dim" style={{ fontSize: 11.5 }}>{sub}</div>}
      </div>
    );
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 24 }}>{value}</div>
      {sub && <div className="dim" style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}
