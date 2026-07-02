import Stripe from "stripe";
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { Plan } from "./plan";

// Stripe server client. The SDK's pinned apiVersion is used (no override) so we
// don't fight the type literal on every SDK bump.
const SECRET = process.env.STRIPE_SECRET_KEY || "";
export const stripeConfigured = !!SECRET;

// Lazy singleton — the SDK throws on an empty key, and env isn't present during
// the build, so we must not construct at import time. Routes guard on
// `stripeConfigured` before calling this; the placeholder just prevents a throw.
//
// Use the fetch-based HTTP client: stripe-node defaults to Node's `https` module,
// which fails with "connection to Stripe" errors on Vercel's serverless runtime.
// `fetch` is the transport Supabase already uses successfully in the same routes.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(SECRET || "sk_placeholder_unconfigured", {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}

// Price IDs are created in Stripe (via the Stripe plugin) and wired in via env.
export const PLAN_PRICE_IDS: Record<Exclude<Plan, "free">, string> = {
  premium: process.env.STRIPE_PRICE_PREMIUM || "",
  ultra: process.env.STRIPE_PRICE_ULTRA || "",
};

// Top-up credit packs. `credits` must match the amounts shown on /upgrade.
export const CREDIT_PACKS: { credits: number; envVar: string; priceId: string }[] = [
  { credits: 3, envVar: "STRIPE_PRICE_CREDITS_3", priceId: process.env.STRIPE_PRICE_CREDITS_3 || "" },
  { credits: 10, envVar: "STRIPE_PRICE_CREDITS_10", priceId: process.env.STRIPE_PRICE_CREDITS_10 || "" },
  { credits: 25, envVar: "STRIPE_PRICE_CREDITS_25", priceId: process.env.STRIPE_PRICE_CREDITS_25 || "" },
];

// Reverse lookups used by the webhook (robust — driven by the real price id, not
// by metadata that a client could tamper with).
export function planForPriceId(priceId: string): Plan | null {
  if (priceId && priceId === PLAN_PRICE_IDS.premium) return "premium";
  if (priceId && priceId === PLAN_PRICE_IDS.ultra) return "ultra";
  return null;
}

export function creditsForPriceId(priceId: string): number | null {
  const pack = CREDIT_PACKS.find((c) => c.priceId && c.priceId === priceId);
  return pack ? pack.credits : null;
}

// Service-role Supabase client for webhook / checkout fulfillment. The webhook
// has no user session, and `profiles` has no client UPDATE policy, so writes to
// plan/credits/customer id MUST go through the service role (server-only key).
export function supabaseAdmin() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export const serviceRoleConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
