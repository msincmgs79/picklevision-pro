import { NextResponse } from "next/server";
import { getStripe, stripeConfigured, serviceRoleConfigured, supabaseAdmin } from "../../../../lib/stripe";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opens the Stripe Billing Portal so a subscriber can update their card, view
// invoices, or cancel — Stripe hosts the whole thing.
export async function POST(req: Request) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: "Payments aren't switched on yet." }, { status: 503 });
  }
  if (!serviceRoleConfigured) {
    return NextResponse.json(
      { error: "Server billing key (SUPABASE_SERVICE_ROLE_KEY) isn't set in the deployment." },
      { status: 503 }
    );
  }
  const stripe = getStripe();

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  try {
    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account yet — subscribe first." }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/upgrade`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe portal error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
