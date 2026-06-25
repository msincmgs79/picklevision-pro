import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { signedReadUrl } from "./storage/server";
import type { InferenceResult, ShotAnalysisResult, LatestAnalysis, ReviewData } from "./analysis";

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
