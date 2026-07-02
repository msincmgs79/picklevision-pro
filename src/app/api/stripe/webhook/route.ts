import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, planForPriceId, supabaseAdmin } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Stripe fulfillment: verifies the signature, then updates plan / credits via
// the service role (no user session on a webhook). This is the source of truth
// for what a user actually paid for — never trust the client for entitlements.
export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  try {
    switch (event.type) {
      // One-time credit-pack purchases are fulfilled here.
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.user_id || s.client_reference_id || "";
        if (s.mode === "payment" && s.metadata?.kind === "credits" && userId) {
          const credits = Number(s.metadata.credits || 0);
          if (credits > 0) {
            await admin.rpc("add_credits", { uid: userId, n: credits });
          }
        }
        break;
      }

      // New subscription → set the plan and start a fresh monthly period.
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const plan = planForPriceId(sub.items.data[0]?.price?.id || "");
        const active = sub.status === "active" || sub.status === "trialing";
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await admin
          .from("profiles")
          .update({
            plan: active && plan ? plan : "free",
            subscription_status: sub.status,
            stripe_subscription_id: sub.id,
            videos_used: 0,
            period_start: now,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      // Plan change / status change (e.g. Premium→Ultra, past_due). Does NOT
      // reset the monthly counter — renewals are handled by invoice.paid.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const plan = planForPriceId(sub.items.data[0]?.price?.id || "");
        const active = sub.status === "active" || sub.status === "trialing";
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await admin
          .from("profiles")
          .update({
            plan: active && plan ? plan : "free",
            subscription_status: sub.status,
            stripe_subscription_id: sub.id,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      // Cancelled subscription → back to Free.
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await admin
          .from("profiles")
          .update({ plan: "free", subscription_status: "canceled", stripe_subscription_id: null })
          .eq("stripe_customer_id", customerId);
        break;
      }

      // Recurring renewal → reset the monthly video allowance.
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) {
          await admin
            .from("profiles")
            .update({ videos_used: 0, period_start: now })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("stripe webhook handler error", event.type, err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
