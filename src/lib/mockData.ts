// Deterministic simulated "AI analysis" data.
// A seeded PRNG keeps server + client renders identical (no hydration mismatch)
// and stands in for what a trained CV/ML model would produce.

export type ShotType =
  | "Serve"
  | "Return"
  | "Drive"
  | "Drop"
  | "Lob"
  | "Smash"
  | "Dink"
  | "Erne"
  | "ATP";

export type Quality = "Excellent" | "Average" | "Poor";
export type Result = "In" | "Net" | "Out";

export interface Shot {
  id: number;
  rally: number;
  type: ShotType;
  quality: Quality;
  result: Result;
  speedMph: number;
  depthFt: number; // depth into opponent court (0 = net, 22 = baseline)
  player: "You" | "Partner";
  side: "Left" | "Right";
  hand: "Forehand" | "Backhand";
  t: number; // seconds into match video
  // normalized court coords (x: 0..1 width, y: 0..1 length; net at y=0.5)
  start: { x: number; y: number };
  end: { x: number; y: number };
  arc: number; // peak height factor
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHOT_TYPES: ShotType[] = [
  "Serve",
  "Return",
  "Drive",
  "Drop",
  "Lob",
  "Smash",
  "Dink",
  "Erne",
  "ATP",
];

const rand = mulberry32(20260621);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + rand() * (b - a);
const round = (n: number, d = 0) => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};

function buildShots(): Shot[] {
  const shots: Shot[] = [];
  let t = 4;
  let id = 1;
  const rallyCount = 28;
  for (let r = 1; r <= rallyCount; r++) {
    const rallyLen = 2 + Math.floor(rand() * 9);
    for (let s = 0; s < rallyLen; s++) {
      let type: ShotType;
      if (s === 0) type = "Serve";
      else if (s === 1) type = "Return";
      else if (s === 2) type = pick(["Drop", "Drive", "Drive", "Lob"]);
      else type = pick(["Dink", "Dink", "Drive", "Drop", "Smash", "Lob", "Erne", "ATP"]);

      const qRoll = rand();
      const quality: Quality =
        qRoll > 0.62 ? "Excellent" : qRoll > 0.24 ? "Average" : "Poor";
      const rRoll = rand();
      const result: Result =
        rRoll > 0.16 ? "In" : rRoll > 0.07 ? "Net" : "Out";

      const speedBase: Record<string, [number, number]> = {
        Serve: [28, 42],
        Return: [24, 38],
        Drive: [32, 52],
        Drop: [14, 24],
        Lob: [16, 28],
        Smash: [44, 62],
        Dink: [10, 19],
        Erne: [30, 46],
        ATP: [34, 50],
      };
      const [sl, sh] = speedBase[type];
      const player: "You" | "Partner" = rand() > 0.42 ? "You" : "Partner";
      const side = rand() > 0.5 ? "Right" : "Left";
      const sx = between(0.12, 0.88);
      const ex = between(0.12, 0.88);
      shots.push({
        id: id++,
        rally: r,
        type,
        quality,
        result,
        speedMph: round(between(sl, sh)),
        depthFt: round(between(2, 21), 1),
        player,
        side,
        hand: rand() > 0.5 ? "Forehand" : "Backhand",
        t: round(t, 1),
        start: { x: sx, y: s % 2 === 0 ? 0.12 : 0.88 },
        end: { x: ex, y: s % 2 === 0 ? 0.82 : 0.18 },
        arc: type === "Lob" ? 0.9 : type === "Drop" ? 0.55 : type === "Dink" ? 0.4 : 0.22,
      });
      t += between(1.4, 3.6);
    }
    t += between(6, 16); // dead time between rallies (removed by "AI")
  }
  return shots;
}

export const shots: Shot[] = buildShots();

export const shotTypeCounts: { type: ShotType; count: number; quality: number }[] =
  SHOT_TYPES.map((type) => {
    const subset = shots.filter((s) => s.type === type);
    const ex = subset.filter((s) => s.quality === "Excellent").length;
    return {
      type,
      count: subset.length,
      quality: subset.length ? round((ex / subset.length) * 100) : 0,
    };
  });

export const qualityBreakdown = {
  Excellent: shots.filter((s) => s.quality === "Excellent").length,
  Average: shots.filter((s) => s.quality === "Average").length,
  Poor: shots.filter((s) => s.quality === "Poor").length,
};

// Third-shot breakdown
const thirdShots = shots.filter((s) => s.type === "Drop" || s.type === "Drive" || s.type === "Lob");
export const thirdShotBreakdown = [
  { label: "Drops", value: Math.round(thirdShots.length * 0.46), color: "var(--primary)" },
  { label: "Drives", value: Math.round(thirdShots.length * 0.34), color: "var(--indigo)" },
  { label: "Hybrids", value: Math.round(thirdShots.length * 0.12), color: "#38bdf8" },
  { label: "Lobs", value: Math.round(thirdShots.length * 0.08), color: "#f472b6" },
];

// Serve & return depth
export const depthStats = {
  serveAvgDepth: 17.8,
  returnAvgDepth: 15.2,
  serveSpeed: 34,
  returnSpeed: 29,
  serveIn: 91,
  returnIn: 88,
  faults: 9,
};

// Skill ratings (0-5 scale, displayed as e.g. 4.4)
export const skillRatings = [
  { label: "Serve", value: 4.2 },
  { label: "Return", value: 3.9 },
  { label: "Offense", value: 4.5 },
  { label: "Defense", value: 3.7 },
  { label: "Agility", value: 4.1 },
  { label: "Consistency", value: 3.6 },
];
export const overallRating = 4.4;

// Team / doubles stats
export const teamStats = {
  kitchenArrival: 78, // % of rallies team reached the kitchen
  partnerKitchen: 64,
  yourShots: 54, // % of team shots taken by you
  partnerShots: 46,
  stacking: 71,
  errorsYou: 11,
  errorsPartner: 14,
};

// Court coverage heatmap (12 x 8 grid intensity 0..1) — your time on court
export const heatmap: number[][] = (() => {
  const rows = 12;
  const cols = 8;
  const grid: number[][] = [];
  const hr = mulberry32(7);
  for (let y = 0; y < rows; y++) {
    const r: number[] = [];
    for (let x = 0; x < cols; x++) {
      // concentrate near the kitchen line (your side ~ row 8-9) and center
      const kitchenBias = Math.max(0, 1 - Math.abs(y - 8.5) / 5);
      const centerBias = Math.max(0, 1 - Math.abs(x - 3.5) / 4);
      const base = kitchenBias * 0.7 + centerBias * 0.3;
      r.push(Math.min(1, base * (0.65 + hr() * 0.6)));
    }
    grid.push(r);
  }
  return grid;
})();

export const movement = {
  distanceFt: 1284,
  efficiency: 82,
  leftSideWin: 61,
  rightSideWin: 49,
};

// Auto highlights
export interface Highlight {
  id: number;
  title: string;
  t: number;
  duration: number;
  rallyLen: number;
  tag: string;
}
export const highlights: Highlight[] = [
  { id: 1, title: "Longest rally of the match", t: 412, duration: 38, rallyLen: 19, tag: "Epic Rally" },
  { id: 2, title: "ATP winner down the line", t: 96, duration: 9, rallyLen: 7, tag: "Winner" },
  { id: 3, title: "Picture-perfect 3rd shot drop", t: 188, duration: 7, rallyLen: 5, tag: "Skill" },
  { id: 4, title: "Erne poach at the net", t: 254, duration: 6, rallyLen: 8, tag: "Aggressive" },
  { id: 5, title: "Speed-up + put-away combo", t: 333, duration: 8, rallyLen: 6, tag: "Combo" },
  { id: 6, title: "Defensive lob reset", t: 470, duration: 11, rallyLen: 12, tag: "Defense" },
];

// Pattern explorer
export interface Pattern {
  id: number;
  sequence: string[];
  count: number;
  winRate: number;
}
export const patterns: Pattern[] = [
  { id: 1, sequence: ["Serve", "Return", "Drop"], count: 14, winRate: 71 },
  { id: 2, sequence: ["Serve", "Return", "Drive"], count: 9, winRate: 44 },
  { id: 3, sequence: ["Dink", "Dink", "Speed-up"], count: 11, winRate: 64 },
  { id: 4, sequence: ["Return", "Drive", "Smash"], count: 6, winRate: 83 },
  { id: 5, sequence: ["Drop", "Dink", "Erne"], count: 5, winRate: 80 },
  { id: 6, sequence: ["Serve", "Return", "Lob"], count: 4, winRate: 25 },
];

// Saved replay filters
export const replayFilters = [
  "Backhand dink errors",
  "Excellent drives",
  "Net faults",
  "Third-shot drops",
  "Smash winners",
  "Returns landing deep",
];

export const matchSummary = {
  result: "Win",
  score: "11–7, 9–11, 11–6",
  date: "Jun 21, 2026",
  team: "Team Martin",
  opponent: "Team Whan",
  partner: "Jordan",
  duration: "47:12",
  activePlay: "22:48",
  deadTimeCut: "24:24",
  totalShots: shots.length,
  rallies: 28,
  winners: 17,
  unforcedErrors: 12,
};

export const qualityColor = (q: Quality) =>
  q === "Excellent" ? "var(--excellent)" : q === "Average" ? "var(--average)" : "var(--poor)";
export const qualityBadgeClass = (q: Quality) =>
  q === "Excellent" ? "badge-excellent" : q === "Average" ? "badge-average" : "badge-poor";
