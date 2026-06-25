import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@picklevision.app";
if (PUBLIC && PRIVATE) {
  try { webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE); } catch {}
}

// Sends a web-push to the signed-in user's stored subscriptions.
export async function POST(req: Request) {
  if (!PUBLIC || !PRIVATE) {
    return NextResponse.json({ ok: false, reason: "push not configured" });
  }
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { title, body, url } = await req.json().catch(() => ({}));
  const payload = JSON.stringify({
    title: title || "PickleVision",
    body: body || "Your match analysis is ready.",
    url: url || "/",
  });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", auth.user.id);

  await Promise.all(
    (subs || []).map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        .catch(async (err: any) => {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        })
    )
  );

  return NextResponse.json({ ok: true, sent: subs?.length || 0 });
}
