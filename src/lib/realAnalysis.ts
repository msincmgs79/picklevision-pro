import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type { InferenceResult, ShotAnalysisResult, LatestAnalysis } from "./analysis";

// Loads the signed-in user's most recent match that has any analysis.
// Returns null in demo mode, when signed out, or when nothing is analyzed yet —
// the analysis screens fall back to the demo data in those cases.
export async function loadLatestAnalysis(): Promise<LatestAnalysis | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("matches")
    .select("id,title,team,opponent,recorded_at,ball_analysis,shot_analysis,created_at")
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
