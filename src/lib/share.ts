import { createClient as createSbClient } from "@supabase/supabase-js";
import type { ShotAnalysisResult, SkillRatings } from "./analysis";

// Service-role Supabase client (bypasses RLS). Used ONLY server-side to render
// the public /s/<token> page and to toggle sharing. Same env as the Stripe
// admin client; kept separate so the public page doesn't pull in the Stripe SDK.
export function supabaseAdmin() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export const serviceRoleConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

// Short, unguessable, URL-safe token (~95 bits). Web Crypto + btoa are globals
// on the Node 18+ serverless runtime, so no node-only imports are needed.
export function makeToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const SKILLS = ["serve", "return", "offense", "defense", "consistency"] as const;
export const SKILL_LABELS: Record<keyof SkillRatings, string> = {
  serve: "Serve",
  return: "Return",
  offense: "Offense",
  defense: "Defense",
  consistency: "Consistency",
};

function num(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function normalizeRatings(r: Partial<SkillRatings> | undefined): SkillRatings {
  return {
    serve: num(r?.serve),
    return: num(r?.return),
    offense: num(r?.offense),
    defense: num(r?.defense),
    consistency: num(r?.consistency),
  };
}

function overallOf(r: SkillRatings): number {
  return SKILLS.reduce((s, k) => s + r[k], 0) / SKILLS.length;
}

function topSkillOf(r: SkillRatings): { key: keyof SkillRatings; label: string; value: number } | null {
  let best: keyof SkillRatings | null = null;
  for (const k of SKILLS) if (best === null || r[k] > r[best]) best = k;
  return best ? { key: best, label: SKILL_LABELS[best], value: r[best] } : null;
}

// The ONLY fields ever exposed on a public share page. Deliberately excludes the
// video path, storage keys, ids, opponent PII beyond the display name, etc.
export interface SharedMatch {
  title: string;
  team: string | null;
  opponent: string | null;
  date: string | null;
  result: "win" | "loss" | null;
  rating: number; // overall for this match (mean of the 5 skills)
  ratings: SkillRatings;
  topSkill: { key: keyof SkillRatings; label: string; value: number } | null;
  summary: string | null;
  coachTip: string | null;
  strengths: string[];
  improvements: string[];
}

// Loads a shared match's summary by token via the service role. Returns null
// unless the row exists, `shared` is true, and it has shot analysis to show.
export async function loadSharedMatch(token: string): Promise<SharedMatch | null> {
  if (!serviceRoleConfigured || !token) return null;
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("matches")
    .select("title,team,opponent,recorded_at,result,shot_analysis,shared")
    .eq("share_token", token)
    .eq("shared", true)
    .maybeSingle();
  if (error || !data) return null;

  const analysis = (data.shot_analysis as ShotAnalysisResult | null)?.analysis;
  if (!analysis?.ratings) return null; // nothing meaningful to show without analysis

  const ratings = normalizeRatings(analysis.ratings);
  const rawResult = (data as { result?: string }).result;

  return {
    title: (data.title as string) || "Match",
    team: (data.team as string) ?? null,
    opponent: (data.opponent as string) ?? null,
    date: (data.recorded_at as string) ?? null,
    result: rawResult === "win" || rawResult === "loss" ? rawResult : null,
    rating: overallOf(ratings),
    ratings,
    topSkill: topSkillOf(ratings),
    summary: analysis.summary || null,
    coachTip: analysis.coachTip || null,
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 3) : [],
    improvements: Array.isArray(analysis.improvements) ? analysis.improvements.slice(0, 3) : [],
  };
}
