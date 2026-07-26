import type {
  ShotAnalysisResult,
  SkillRatings,
  RatedGame,
  RatingsRollup,
} from "./analysis";

// A roster entry owned by a coach. `managed` = coach-owned (no login);
// `invited`/`active` are for Phase 3b (real linked users).
export interface Student {
  id: string;
  coach_id: string;
  name: string;
  email: string | null;
  notes: string | null;
  linked_user_id: string | null;
  invite_token: string | null;
  status: "managed" | "invited" | "active";
  created_at: string;
}

// A reusable drill in a coach's library.
export interface Drill {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  category: string | null;
  video_url: string | null;
  created_at: string;
}

// A drill assigned to a student (title/description snapshotted from the drill).
export interface DrillAssignment {
  id: string;
  coach_id: string;
  student_id: string;
  drill_id: string | null;
  title: string;
  description: string | null;
  note: string | null;
  done: boolean;
  created_at: string;
}

// One match row as fetched for a student's rollup.
export interface StudentMatchRow {
  id: string;
  title: string | null;
  recorded_at: string | null;
  created_at: string | null;
  result?: string | null;
  shot_analysis: ShotAnalysisResult | null;
}

const SKILLS = ["serve", "return", "offense", "defense", "consistency"] as const;
const RECENCY_DECAY = 0.8; // each older game counts 0.8x the next-newer one

function num(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

// Recency-weighted career rollup from a student's analyzed matches — the same
// math as loadRatingsRollup, but pure so it can run client-side over any set of
// rows (a student's tagged matches). Pass rows oldest -> newest. Null if none
// carry shot-analysis ratings.
export function rollupFromRows(rows: StudentMatchRow[]): RatingsRollup | null {
  const games: RatedGame[] = [];
  for (const m of rows) {
    const r = m.shot_analysis?.analysis?.ratings;
    if (!r) continue;
    const ratings: SkillRatings = {
      serve: num(r.serve),
      return: num(r.return),
      offense: num(r.offense),
      defense: num(r.defense),
      consistency: num(r.consistency),
    };
    const overall = SKILLS.reduce((s, k) => s + ratings[k], 0) / SKILLS.length;
    const rawResult = m.result;
    games.push({
      matchId: m.id,
      title: m.title || "Match",
      date: m.recorded_at || m.created_at || null,
      overall,
      ratings,
      result: rawResult === "win" || rawResult === "loss" ? rawResult : null,
    });
  }
  if (!games.length) return null;

  const n = games.length;
  const weight = (i: number) => Math.pow(RECENCY_DECAY, n - 1 - i);
  const wSum = games.reduce((s, _g, i) => s + weight(i), 0);
  const overall = games.reduce((s, g, i) => s + weight(i) * g.overall, 0) / wSum;
  const ratings = SKILLS.reduce((acc, k) => {
    acc[k] = games.reduce((s, g, i) => s + weight(i) * g.ratings[k], 0) / wSum;
    return acc;
  }, {} as SkillRatings);

  const wins = games.filter((g) => g.result === "win").length;
  const losses = games.filter((g) => g.result === "loss").length;

  return { overall, ratings, games, count: games.length, wins, losses };
}
