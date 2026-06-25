import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../lib/supabase/config";
import { signedReadUrl } from "../../../lib/storage/server";
import { inferEndpoint } from "../../../lib/analysis";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 503 });
  }
  const endpoint = inferEndpoint();
  if (!endpoint) {
    return NextResponse.json(
      { error: "Inference service not configured (RAILWAY_INFERENCE_URL missing)." },
      { status: 503 }
    );
  }

  let matchId: string | undefined;
  try {
    ({ matchId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!matchId) return NextResponse.json({ error: "matchId required." }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // RLS ensures the user can only read their own match
  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id, video_path")
    .eq("id", matchId)
    .single();
  if (mErr || !match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
  if (!match.video_path)
    return NextResponse.json({ error: "This match has no uploaded video." }, { status: 400 });

  // Short-lived signed URL the Railway service can download from
  const videoUrl = await signedReadUrl(supabase, match.video_path, 600);
  if (!videoUrl)
    return NextResponse.json({ error: "Could not sign the video URL." }, { status: 500 });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoUrl }),
      // never cache an inference run
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail || `Inference failed (${res.status}).` },
        { status: 502 }
      );
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Could not reach the inference service." },
      { status: 502 }
    );
  }
}
