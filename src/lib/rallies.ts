import type { TrackResult, Trajectory } from "./analysis";

// Derive rallies, highlights and dead-time from a full-video ball track —
// reusing the trajectories the /track endpoint already produces (each
// continuous run of ball detections ≈ one rally). No extra model needed.

export interface Rally {
  index: number;
  start: number; // seconds
  end: number;
  duration: number; // seconds
  shots: number; // approximate contacts (ball direction reversals)
  inOut?: string | null;
}

export interface RallyAnalysis {
  rallies: Rally[];
  highlightIdx: number[]; // indices into rallies, longest/most-active first
  count: number;
  longest: number; // seconds
  avgDuration: number; // seconds
  activeSec: number; // total in-play seconds
  deadSec: number; // gaps between rallies
  totalShots: number;
}

// Approximate shot count: how many times the ball reverses down-court direction.
function countShots(pts: Trajectory["points"]): number {
  if (pts.length < 2) return 1;
  let shots = 1;
  let lastDir = 0;
  for (let i = 1; i < pts.length; i++) {
    const dy = pts[i].courtY - pts[i - 1].courtY;
    const dir = dy > 0.4 ? 1 : dy < -0.4 ? -1 : 0; // ignore jitter
    if (dir !== 0 && lastDir !== 0 && dir !== lastDir) shots++;
    if (dir !== 0) lastDir = dir;
  }
  return shots;
}

export function analyzeRallies(track: TrackResult): RallyAnalysis {
  const rallies: Rally[] = (track.trajectories || [])
    .map((tr, i) => {
      const pts = tr.points;
      const start = pts[0]?.t ?? 0;
      const end = pts[pts.length - 1]?.t ?? start;
      return { index: i, start, end, duration: Math.max(0, end - start), shots: countShots(pts), inOut: tr.inOut };
    })
    .filter((r) => r.duration >= 0.5)
    .map((r, i) => ({ ...r, index: i }));

  const count = rallies.length;
  const longest = rallies.reduce((m, r) => Math.max(m, r.duration), 0);
  const activeSec = rallies.reduce((s, r) => s + r.duration, 0);
  const totalShots = rallies.reduce((s, r) => s + r.shots, 0);
  const avgDuration = count ? activeSec / count : 0;
  const span = track.window?.seconds || (rallies.length ? rallies[rallies.length - 1].end : 0);
  const deadSec = Math.max(0, span - activeSec);

  const highlightIdx = [...rallies]
    .sort((a, b) => b.duration + b.shots - (a.duration + a.shots))
    .slice(0, 3)
    .map((r) => r.index);

  return { rallies, highlightIdx, count, longest, avgDuration, activeSec, deadSec, totalShots };
}
