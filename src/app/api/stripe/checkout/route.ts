import { NextResponse } from "next/server";
import { getStripe, stripeConfigured, serviceRoleConfigured, PLAN_PRICE_IDS, CREDIT_PACKS, supabaseAdmin } from "../../../../lib/stripe";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creates a Stripe Checkout Session for a subscription (Premium/Ultra) or a
// one-time credit pack, and returns its hosted-page URL for the client to open.
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

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const success_url = `${origin}/upgrade?checkout=success`;
  const cancel_url = `${origin}/upgrade?checkout=cancel`;

  // Everything below (customer lookup/creation + session) is wrapped so a
  // Stripe/Supabase failure returns a JSON error instead of a blank 500.
  try {
    // Reuse (or create) this user's Stripe customer. Persisted via the service
    // role because `profiles` has no client UPDATE policy.
    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    let customerId = profile?.stripe_customer_id || "";
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    if (body.kind === "subscription") {
      const plan = String(body.plan);
      const price = plan === "premium" || plan === "ultra" ? PLAN_PRICE_IDS[plan] : "";
      if (!price) return NextResponse.json({ error: "That plan isn't available yet." }, { status: 400 });
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        success_url,
        cancel_url,
        client_reference_id: user.id,
        allow_promotion_codes: true,
        metadata: { user_id: user.id, kind: "subscription", plan },
        subscription_data: { metadata: { user_id: user.id, plan } },
      });
      return NextResponse.json({ url: session.url });
    }

    if (body.kind === "credits") {
      const pack = CREDIT_PACKS.find((c) => c.credits === Number(body.credits));
      if (!pack || !pack.priceId) {
        return NextResponse.json({ error: "That credit pack isn't available yet." }, { status: 400 });
      }
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{ price: pack.priceId, quantity: 1 }],
        success_url,
        cancel_url,
        client_reference_id: user.id,
        metadata: { user_id: user.id, kind: "credits", credits: String(pack.credits) },
        payment_intent_data: { metadata: { user_id: user.id, kind: "credits", credits: String(pack.credits) } },
      });
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Unknown checkout type." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe checkout error:", msg);
    // Surface the message to help diagnose setup issues (sandbox/testing).
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
