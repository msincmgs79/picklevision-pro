import { createClient } from "../../../lib/supabase/server";
import { GEMINI_KEY, geminiConfigured, COACH_MODEL, geminiStreamUrl } from "../../../lib/gemini";
import type { ShotAnalysis, ShotAnalysisResult } from "../../../lib/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMsg = { role: "user" | "assistant"; content: string };

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Builds a system prompt grounded in THIS match's real analysis, so the coach
// answers from actual data instead of inventing stats.
function buildSystemPrompt(
  match: { title?: string; team?: string; opponent?: string; result?: string },
  a: ShotAnalysis
): string {
  const teams =
    match.team && match.opponent ? `${match.team} vs ${match.opponent}` : match.team || match.opponent || "the players";
  const r = a.ratings || ({} as ShotAnalysis["ratings"]);
  const facts = {
    match: match.title || "Match",
    teams,
    result: match.result === "win" || match.result === "loss" ? match.result : "not recorded",
    skillRatings_DUPRscale_2to8: r,
    kitchenControl_0to100: a.kitchenControl ?? null,
    positioning: a.positioning ?? null,
    shotTypesEmphasis: a.shotTypes ?? [],
    shotsObserved: a.shotsObserved ?? [],
    strengths: a.strengths ?? [],
    improvements: a.improvements ?? [],
    priorCoachTip: a.coachTip ?? null,
    summary: a.summary ?? null,
  };
  return [
    "You are PickleVision's AI pickleball coach — an encouraging, specific, no-fluff coach talking to a player about ONE match you have already analyzed from their video.",
    "",
    "You have exactly this analysis to work from (JSON):",
    JSON.stringify(facts, null, 2),
    "",
    "Rules:",
    "- Ground every claim in the analysis above. Do NOT invent scores, stats, or events that aren't in the data.",
    "- If asked about something the analysis doesn't capture (e.g. a specific point, the exact score, opponent details), say it isn't in this match's data and offer what you CAN speak to.",
    "- The skill ratings are an AI ESTIMATE on the DUPR 2.0–8.0 scale. Never claim they are an official DUPR rating; call them an estimate.",
    "- When giving advice, be concrete: name the shot or situation, then give a specific drill or cue the player can practice. Prefer 1–3 focused suggestions over a long list.",
    "- Keep replies tight and conversational (a few short paragraphs or a short list). You're chatting, not writing an essay.",
    "- Be motivating and constructive; lead with what's working before what to fix.",
  ].join("\n");
}

type GeminiPart = { text?: string };
type GeminiChunk = { candidates?: { content?: { parts?: GeminiPart[] } }[] };

// Streaming coach chat, grounded in the match's analysis, powered by Gemini
// (same provider as the AI breakdown). Auth + ownership are enforced via the
// RLS-scoped client (the user can only read their own matches).
export async function POST(req: Request) {
  if (!geminiConfigured) {
    return json({ error: "The AI coach isn't switched on yet." }, 503);
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return json({ error: "Please sign in first." }, 401);

  let body: { matchId?: string; messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  const matchId = body.matchId;
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  if (!matchId || rawMessages.length === 0) return json({ error: "matchId and messages are required." }, 400);

  // Ownership + analysis load (RLS-scoped → only the caller's own match).
  const { data: match } = await supabase
    .from("matches")
    .select("title,team,opponent,result,shot_analysis")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return json({ error: "Match not found." }, 404);

  const analysis = (match.shot_analysis as ShotAnalysisResult | null)?.analysis;
  if (!analysis?.ratings) {
    return json({ error: "Run the AI shot breakdown first — the coach reads that analysis." }, 400);
  }

  // Normalize + bound the conversation: last 12 turns, cap size, drop empties,
  // ensure the first turn is from the user (Gemini requires user-first).
  const turns = rawMessages
    .slice(-12)
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      content: String(m.content || "").slice(0, 4000),
    }))
    .filter((m) => m.content.trim().length > 0);
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (turns.length === 0) return json({ error: "Say something to the coach first." }, 400);

  const geminiBody = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(match, analysis) }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.content }] })),
    generationConfig: {
      maxOutputTokens: 1600,
      temperature: 0.7,
      // Grounded chat doesn't need the model's internal reasoning — disabling it
      // keeps replies fast and cheap.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  let geminiRes: Response;
  try {
    geminiRes = await fetch(geminiStreamUrl(COACH_MODEL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_KEY,
      },
      body: JSON.stringify(geminiBody),
    });
  } catch (err) {
    console.error("coach fetch error:", err instanceof Error ? err.message : String(err));
    return json({ error: "Couldn't reach the coach. Please try again." }, 502);
  }

  if (!geminiRes.ok || !geminiRes.body) {
    const detail = await geminiRes.text().catch(() => "");
    console.error("coach gemini error:", geminiRes.status, detail.slice(0, 500));
    return json({ error: "The coach is unavailable right now. Please try again." }, 502);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = geminiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // keep the trailing partial line
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const chunk = JSON.parse(data) as GeminiChunk;
              const parts = chunk.candidates?.[0]?.content?.parts;
              if (Array.isArray(parts)) {
                for (const p of parts) {
                  if (typeof p.text === "string" && p.text) controller.enqueue(encoder.encode(p.text));
                }
              }
            } catch {
              /* skip malformed SSE line */
            }
          }
        }
      } catch (err) {
        console.error("coach stream error:", err instanceof Error ? err.message : String(err));
        controller.enqueue(encoder.encode("\n\n_(The coach hit a snag. Please try again.)_"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
