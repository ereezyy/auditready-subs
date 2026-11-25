import Stripe from "stripe";

const APP = "auditready-subs";

const PRODUCTS = [
  {
    plan: "starter",
    name: "AuditReady Subs Starter",
    description: "15 subcontractors, reminders, uncovered dollars, and the audit packet.",
    amount: 1900,
    recurring: true,
    env: "STRIPE_PRICE_STARTER",
  },
  {
    plan: "pro",
    name: "AuditReady Subs Pro",
    description: "50 subcontractors. This is the plan used for the 14-day trial.",
    amount: 3900,
    recurring: true,
    env: "STRIPE_PRICE_PRO",
  },
  {
    plan: "plus",
    name: "AuditReady Subs Plus",
    description: "Unlimited subcontractors.",
    amount: 7900,
    recurring: true,
    env: "STRIPE_PRICE_PLUS",
  },
  {
    plan: "audit_rescue",
    name: "Audit Rescue",
    description: "One-time audit packet for the certificates already on file.",
    amount: 14900,
    recurring: false,
    env: "STRIPE_PRICE_AUDIT_RESCUE",
  },
];

function assertTestKey(key) {
  if (!key) {
    console.error("Set STRIPE_SECRET_KEY to a test key (sk_test_...) before creating products.");
    process.exit(1);
  }
  if (key.startsWith("sk_live") || key.startsWith("rk_live")) {
    console.error("Refusing to create products with a live Stripe key.");
    process.exit(1);
  }
  if (!key.startsWith("sk_test") && !key.startsWith("rk_test")) {
    console.error("STRIPE_SECRET_KEY must be a test-mode secret key.");
    process.exit(1);
  }
}

const key = process.env.STRIPE_SECRET_KEY ?? "";
assertTestKey(key);
const stripe = new Stripe(key);

const lines = [];
for (const product of PRODUCTS) {
  const existing = await stripe.products.search({
    query: `metadata['app']:'${APP}' AND metadata['plan']:'${product.plan}'`,
    limit: 1,
  });
  const record =
    existing.data[0] ??
    (await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: { app: APP, plan: product.plan },
    }));
  const prices = await stripe.prices.list({ product: record.id, active: true, limit: 20 });
  const match = prices.data.find((price) => {
    const recurring = Boolean(price.recurring);
    return price.unit_amount === product.amount && price.currency === "usd" && recurring === product.recurring;
  });
  const price =
    match ??
    (await stripe.prices.create({
      product: record.id,
      unit_amount: product.amount,
      currency: "usd",
      ...(product.recurring ? { recurring: { interval: "month" } } : {}),
      metadata: { app: APP, plan: product.plan },
    }));
  lines.push(`${product.env}=${price.id}`);
  console.log(`${product.name}: ${price.id}`);
}

console.log("\nAdd these to .env.local:");
console.log(lines.join("\n"));
