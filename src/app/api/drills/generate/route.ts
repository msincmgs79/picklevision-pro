import { createClient } from "../../../../lib/supabase/server";
import { GEMINI_KEY, geminiConfigured, COACH_MODEL, geminiGenerateUrl } from "../../../../lib/gemini";
import type { ShotAnalysis, ShotAnalysisResult } from "../../../../lib/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

type GenDrill = { title: string; description: string; targets?: string };
type MatchRow = { id: string; title: string | null; shot_analysis: ShotAnalysisResult | null };

function buildPrompt(match: { title?: string | null }, a: ShotAnalysis): string {
  const facts = {
    match: match.title || "Match",
    skillRatings_DUPRscale_2to8: a.ratings || {},
    strengths: a.strengths ?? [],
    improvements: a.improvements ?? [],
    coachTip: a.coachTip ?? null,
    summary: a.summary ?? null,
  };
  return [
    "You are PickleVision's AI pickleball coach. Turn ONE match's analysis into a short set of practice drills the player can do to fix their weaknesses.",
    "",
    "Analysis to work from (JSON):",
    JSON.stringify(facts, null, 2),
    "",
    "Produce 3–5 drills. Rules:",
    "- Each drill must target a real weakness from `improvements` (or the lowest skill ratings). Prioritise the biggest gaps.",
    "- `title`: a short, punchy drill name (max ~6 words).",
    "- `description`: 2–3 sentences — exactly how to run the drill (setup, reps, what to focus on). Concrete and practice-able, not generic advice.",
    "- `targets`: the specific weakness/skill this drill improves (a few words).",
    "- Ground everything in this player's actual analysis. Do not invent stats. Be encouraging and specific.",
  ].join("\n");
}

export async function POST(req: Request) {
  if (!geminiConfigured) return json({ error: "AI drills aren't switched on yet." }, 503);

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return json({ error: "Please sign in first." }, 401);

  let body: { matchId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* body optional — we'll fall back to the latest analyzed match */
  }

  // Load the source match (RLS-scoped → only the caller's own matches).
  let match: MatchRow | null = null;
  if (body.matchId) {
    const { data } = await supabase
      .from("matches")
      .select("id,title,shot_analysis")
      .eq("id", body.matchId)
      .maybeSingle();
    match = (data as MatchRow | null) || null;
  } else {
    const { data } = await supabase
      .from("matches")
      .select("id,title,shot_analysis")
      .not("shot_analysis", "is", null)
      .order("recorded_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1);
    match = ((data as MatchRow[] | null) || [])[0] || null;
  }
  if (!match) return json({ error: "No match found. Record and analyze a match first." }, 404);

  const analysis = match.shot_analysis?.analysis;
  if (!analysis?.ratings) {
    return json({ error: "Run the AI shot breakdown on this match first — the drills come from that analysis." }, 400);
  }

  // Ask Gemini for structured JSON (same provider/key/bill as the breakdown + coach).
  const geminiBody = {
    contents: [{ role: "user", parts: [{ text: buildPrompt(match, analysis) }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1200,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            targets: { type: "STRING" },
          },
          required: ["title", "description"],
        },
      },
    },
  };

  let text = "";
  try {
    const res = await fetch(geminiGenerateUrl(COACH_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify(geminiBody),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("drills gemini error:", res.status, detail.slice(0, 400));
      return json({ error: "The drill generator is unavailable right now. Please try again." }, 502);
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  } catch (err) {
    console.error("drills fetch error:", err instanceof Error ? err.message : String(err));
    return json({ error: "Couldn't reach the drill generator. Please try again." }, 502);
  }

  let drills: GenDrill[] = [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) drills = parsed as GenDrill[];
  } catch {
    console.error("drills parse error:", text.slice(0, 300));
  }
  drills = drills
    .filter((d) => d && typeof d.title === "string" && d.title.trim())
    .slice(0, 5)
    .map((d) => ({
      title: String(d.title).slice(0, 120).trim(),
      description: String(d.description || "").slice(0, 800).trim(),
      targets: d.targets ? String(d.targets).slice(0, 120).trim() : undefined,
    }));
  if (!drills.length) return json({ error: "The generator didn't return any drills. Please try again." }, 502);

  // Insert as the player's own drills (RLS: "user manages own drills").
  const rows = drills.map((d) => ({
    user_id: user.id,
    source: "ai",
    match_id: match!.id,
    title: d.title,
    description: d.description || null,
    note: d.targets ? `Targets: ${d.targets}` : null,
    done: false,
  }));
  const { data: inserted, error } = await supabase.from("drill_assignments").insert(rows).select("*");
  if (error) {
    console.error("drills insert error:", error.message);
    return json({ error: "Couldn't save the drills. Please try again." }, 500);
  }

  return json({ drills: inserted, matchTitle: match.title || "your last match" }, 200);
}
