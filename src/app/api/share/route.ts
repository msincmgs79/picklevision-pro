import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { supabaseAdmin, serviceRoleConfigured, makeToken } from "../../../lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Enables or disables the public share link for a match the caller owns.
// Ownership is enforced by the user's RLS-scoped client (they can only SELECT
// their own matches); the write itself goes through the service role because
// `matches` has no client UPDATE policy for these columns.
export async function POST(req: Request) {
  if (!serviceRoleConfigured) {
    return NextResponse.json({ error: "Sharing isn't switched on yet." }, { status: 503 });
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  let body: { matchId?: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const matchId = body.matchId;
  const enabled = body.enabled !== false; // default to enabling
  if (!matchId) return NextResponse.json({ error: "matchId required." }, { status: 400 });

  // Ownership check via the RLS-scoped client — returns the row only if it's theirs.
  const { data: owned } = await supabase
    .from("matches")
    .select("id,share_token")
    .eq("id", matchId)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "Match not found." }, { status: 404 });

  const token = (owned.share_token as string | null) || (enabled ? makeToken() : null);
  const update: Record<string, unknown> = { shared: enabled };
  if (token && !owned.share_token) update.share_token = token;

  const admin = supabaseAdmin();
  const { error } = await admin.from("matches").update(update).eq("id", matchId);
  if (error) {
    console.error("share toggle error:", error.message);
    return NextResponse.json({ error: "Couldn't update sharing." }, { status: 500 });
  }

  return NextResponse.json({
    shared: enabled,
    token,
    path: enabled && token ? `/s/${token}` : null,
  });
}
