// One-time Stripe setup: creates the products + prices PickleVision needs and
// prints the env vars to wire in. Idempotent — reuses any price that already
// exists (matched by lookup_key), so it's safe to re-run.
//
// Run it (secret key stays in .env.local — never passed on the command line):
//   node scripts/stripe-setup.mjs
//
// It reads STRIPE_SECRET_KEY from the environment or from .env.local.

import fs from "node:fs";
import Stripe from "stripe";

// Best-effort .env.local loader (so we don't depend on a specific Node version's
// --env-file support). Only fills vars that aren't already set.
try {
  const txt = fs.readFileSync(".env.local", "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on process.env */
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(
    "\n✗ STRIPE_SECRET_KEY not found.\n" +
      "  Add a line to .env.local:  STRIPE_SECRET_KEY=sk_test_...\n" +
      "  (your Stripe sandbox secret key), then re-run: node scripts/stripe-setup.mjs\n"
  );
  process.exit(1);
}
if (!key.startsWith("sk_test_")) {
  console.error("\n✗ That doesn't look like a TEST/sandbox key (expected sk_test_...). Aborting to be safe.\n");
  process.exit(1);
}

const stripe = new Stripe(key);

const items = [
  { name: "PickleVision Premium", lookup: "pv_premium_monthly", amount: 1999, recurring: true, env: "STRIPE_PRICE_PREMIUM" },
  { name: "PickleVision Ultra", lookup: "pv_ultra_monthly", amount: 4999, recurring: true, env: "STRIPE_PRICE_ULTRA" },
  { name: "PickleVision — 3 credits", lookup: "pv_credits_3", amount: 1199, recurring: false, env: "STRIPE_PRICE_CREDITS_3" },
  { name: "PickleVision — 10 credits", lookup: "pv_credits_10", amount: 3499, recurring: false, env: "STRIPE_PRICE_CREDITS_10" },
  { name: "PickleVision — 25 credits", lookup: "pv_credits_25", amount: 7999, recurring: false, env: "STRIPE_PRICE_CREDITS_25" },
];

const out = [];
for (const it of items) {
  const existing = await stripe.prices.list({ lookup_keys: [it.lookup], limit: 1 });
  let price = existing.data[0];
  if (price) {
    console.log(`• reused  ${it.name}  (${price.id})`);
  } else {
    const product = await stripe.products.create({ name: it.name });
    price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: it.amount,
      lookup_key: it.lookup,
      ...(it.recurring ? { recurring: { interval: "month" } } : {}),
    });
    console.log(`✓ created ${it.name}  (${price.id})`);
  }
  out.push(`${it.env}=${price.id}`);
}

console.log("\n=== Add these to Vercel env AND .env.local ===\n");
console.log(out.join("\n"));
console.log("");
