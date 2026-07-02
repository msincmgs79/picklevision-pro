import { NextResponse } from "next/server";
import { getStripe, stripeConfigured, supabaseAdmin } from "../../../../lib/stripe";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opens the Stripe Billing Portal so a subscriber can update their card, view
// invoices, or cancel — Stripe hosts the whole thing.
export async function POST(req: Request) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: "Payments aren't switched on yet." }, { status: 503 });
  }
  const stripe = getStripe();

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet — subscribe first." }, { status: 400 });
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/upgrade`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe portal error", err);
    return NextResponse.json({ error: "Couldn't open billing portal." }, { status: 500 });
  }
}
