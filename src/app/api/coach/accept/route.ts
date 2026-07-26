import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { supabaseAdmin, serviceRoleConfigured } from "../../../../lib/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?token=... — public invite lookup (service role): returns whether the
// invite is valid and the roster name, so the join page can show it. The
// unguessable token is the gate; no coach identity is exposed.
export async function GET(req: Request) {
  if (!serviceRoleConfigured) return NextResponse.json({ valid: false, reason: "unconfigured" }, { status: 503 });
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token) return NextResponse.json({ valid: false, reason: "no_token" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("students")
    .select("name,status,linked_user_id")
    .eq("invite_token", token)
    .maybeSingle();

  if (!data) return NextResponse.json({ valid: false, reason: "not_found" });
  if (data.status === "active" || data.linked_user_id) {
    return NextResponse.json({ valid: false, reason: "already_linked", name: data.name });
  }
  return NextResponse.json({ valid: true, name: data.name });
}

// POST { token } — the signed-in user accepts the invite: link their account to
// the roster entry so their coach can see their progress. Service role, because
// the invitee is not the coach and can't update the roster row under RLS.
export async function POST(req: Request) {
  if (!serviceRoleConfigured) return NextResponse.json({ error: "Invites aren't switched on yet." }, { status: 503 });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const token = body.token;
  if (!token) return NextResponse.json({ error: "token required." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: student } = await admin
    .from("students")
    .select("id,coach_id,status,linked_user_id,name")
    .eq("invite_token", token)
    .maybeSingle();

  if (!student) return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  if (student.status === "active" || student.linked_user_id) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 409 });
  }
  if (student.coach_id === user.id) {
    return NextResponse.json({ error: "You can't accept your own invite." }, { status: 400 });
  }

  const { error } = await admin
    .from("students")
    .update({ linked_user_id: user.id, status: "active", invite_token: null })
    .eq("id", student.id)
    .eq("invite_token", token); // guard against a race
  if (error) {
    console.error("coach accept error:", error.message);
    return NextResponse.json({ error: "Couldn't accept the invite. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name: student.name });
}
