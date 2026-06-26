import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { signedReadUrl } from "./storage/server";
import type {
  InferenceResult,
  ShotAnalysisResult,
  LatestAnalysis,
  ReviewData,
  RatingsRollup,
  RatedGame,
  SkillRatings,
} from "./analysis";

const SKILLS = ["serve", "return", "offense", "defense", "consistency"] as const;
const RECENCY_DECAY = 0.8; // each older game counts 0.8x the next-newer one

function num(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

// Loads the signed-in user's most recent match that has any analysis.
// Returns null in demo mode, when signed out, or when nothing is analyzed yet —
// the analysis screens fall back to the demo data in those cases.
export async function loadLatestAnalysis(matchId?: string): Promise<LatestAnalysis | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const base = supabase
    .from("matches")
    .select("id,title,team,opponent,recorded_at,ball_analysis,shot_analysis,created_at");
  const { data } = matchId
    ? await base.eq("id", matchId).maybeSingle()
    : await base
        .or("ball_analysis.not.is.null,shot_analysis.not.is.null")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (!data) return null;

  return {
    matchId: data.id,
    title: data.title,
    team: data.team,
    opponent: data.opponent,
    recordedAt: data.recorded_at,
    ball: (data.ball_analysis as InferenceResult) || null,
    shot: (data.shot_analysis as ShotAnalysisResult) || null,
  };
}

// Career rating across ALL of the user's analyzed games: a recency-weighted
// overall + per-skill (newer games count more), plus each game's own rating and
// a chronological series for the trend chart. Null in demo/signed-out/no-games.
export async function loadRatingsRollup(): Promise<RatingsRollup | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Oldest -> newest so the most recent game gets the heaviest weight.
  const { data } = await supabase
    .from("matches")
    .select("id,title,recorded_at,created_at,shot_analysis")
    .not("shot_analysis", "is", null)
    .order("created_at", { ascending: true });
  if (!data?.length) return null;

  const games: RatedGame[] = [];
  for (const m of data) {
    const r = (m.shot_analysis as ShotAnalysisResult | null)?.analysis?.ratings;
    if (!r) continue;
    const ratings: SkillRatings = {
      serve: num(r.serve),
      return: num(r.return),
      offense: num(r.offense),
      defense: num(r.defense),
      consistency: num(r.consistency),
    };
    const overall = SKILLS.reduce((s, k) => s + ratings[k], 0) / SKILLS.length;
    games.push({
      matchId: m.id as string,
      title: (m.title as string) || "Match",
      date: (m.recorded_at as string) || (m.created_at as string) || null,
      overall,
      ratings,
    });
  }
  if (!games.length) return null;

  // Recency-weighted mean: newest game (last) has weight 1, each older 0.8x.
  const n = games.length;
  const weight = (i: number) => Math.pow(RECENCY_DECAY, n - 1 - i);
  const wSum = games.reduce((s, _g, i) => s + weight(i), 0);
  const overall = games.reduce((s, g, i) => s + weight(i) * g.overall, 0) / wSum;
  const ratings = SKILLS.reduce((acc, k) => {
    acc[k] = games.reduce((s, g, i) => s + weight(i) * g.ratings[k], 0) / wSum;
    return acc;
  }, {} as SkillRatings);

  return { overall, ratings, games, count: games.length };
}

// Latest analyzed match plus its signed video URL and saved bookmarks (for /review).
export async function loadLatestReview(matchId?: string): Promise<ReviewData | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const base = supabase
    .from("matches")
    .select("id,title,team,opponent,recorded_at,video_path,ball_analysis,shot_analysis,created_at");
  const { data } = matchId
    ? await base.eq("id", matchId).maybeSingle()
    : await base
        .or("ball_analysis.not.is.null,shot_analysis.not.is.null")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  if (!data) return null;

  let videoUrl: string | null = null;
  if (data.video_path) {
    videoUrl = await signedReadUrl(supabase, data.video_path, 60 * 60);
  }

  const { data: bms } = await supabase
    .from("bookmarks")
    .select("id,t,label")
    .eq("match_id", data.id)
    .order("t", { ascending: true });

  return {
    matchId: data.id,
    title: data.title,
    team: data.team,
    opponent: data.opponent,
    recordedAt: data.recorded_at,
    ball: (data.ball_analysis as InferenceResult) || null,
    shot: (data.shot_analysis as ShotAnalysisResult) || null,
    videoUrl,
    bookmarks: (bms as ReviewData["bookmarks"]) || [],
  };
}
