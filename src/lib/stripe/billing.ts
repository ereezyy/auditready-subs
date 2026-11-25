import "server-only";
import Stripe from "stripe";
import { appUrl } from "@/lib/clock";
import { assertStripeTestKey, stripeMode } from "@/lib/env";
import type { PlanId } from "@/lib/domain/types";
import { AUDIT_RESCUE_CENTS, PLANS } from "@/lib/domain/plans";
import { getStore } from "@/lib/store";

export type CheckoutPlan = PlanId | "audit_rescue";

const PRICE_ENV: Record<Exclude<CheckoutPlan, "free">, string> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
  plus: "STRIPE_PRICE_PLUS",
  audit_rescue: "STRIPE_PRICE_AUDIT_RESCUE",
};

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  assertStripeTestKey(key);
  return new Stripe(key);
}

export function priceIdFor(plan: Exclude<CheckoutPlan, "free">): string {
  const envName = PRICE_ENV[plan];
  const value = process.env[envName];
  if (!value) {
    throw new Error(`${envName} is not set. Run npm run stripe:products with a test key.`);
  }
  return value;
}

export async function createCheckoutSession(input: {
  contractorId: string;
  email: string;
  plan: Exclude<CheckoutPlan, "free">;
}): Promise<string> {
  if (stripeMode() !== "test") {
    throw new Error("Stripe test mode is not configured.");
  }
  const stripe = getStripe();
  const price = priceIdFor(input.plan);
  const session = await stripe.checkout.sessions.create({
    mode: input.plan === "audit_rescue" ? "payment" : "subscription",
    customer_email: input.email,
    client_reference_id: input.contractorId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/app/billing?checkout=success`,
    cancel_url: `${appUrl()}/app/billing?checkout=cancel`,
    metadata: {
      app: "auditready-subs",
      contractorId: input.contractorId,
      plan: input.plan,
    },
    ...(input.plan === "audit_rescue"
      ? {}
      : {
          subscription_data: {
            metadata: { contractorId: input.contractorId, plan: input.plan },
          },
        }),
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export function amountLabel(plan: Exclude<CheckoutPlan, "free">): string {
  if (plan === "audit_rescue") return `$${(AUDIT_RESCUE_CENTS / 100).toFixed(0)} once`;
  const found = PLANS.find((item) => item.id === plan);
  return found ? `$${(found.monthlyCents / 100).toFixed(0)}/month` : plan;
}

function knownPlan(value: string | undefined): PlanId | null {
  if (value === "free" || value === "starter" || value === "pro" || value === "plus") return value;
  return null;
}

function planFromPrice(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_PLUS) return "plus";
  return null;
}

export async function applyStripeEvent(event: Stripe.Event) {
  const store = getStore();
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const contractorId = session.metadata?.contractorId || session.client_reference_id;
    const plan = session.metadata?.plan;
    if (!contractorId) return;
    const customerId = typeof session.customer === "string" ? session.customer : null;
    if (plan === "audit_rescue") {
      await store.updateContractor(contractorId, {
        auditRescuePurchasedAt: new Date().toISOString(),
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      });
      return;
    }
    if (plan === "starter" || plan === "pro" || plan === "plus") {
      await store.updateContractor(contractorId, {
        plan,
        subscriptionStatus: "active",
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
      });
    }
    return;
  }

  if (event.type !== "customer.subscription.updated" && event.type !== "customer.subscription.deleted") {
    return;
  }
  const subscription = event.data.object;
  const contractorId = subscription.metadata?.contractorId;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  const contractor = contractorId
    ? await store.findContractorById(contractorId)
    : customerId
      ? await store.findContractorByStripeCustomer(customerId)
      : null;
  if (!contractor) return;
  const ended =
    event.type === "customer.subscription.deleted" ||
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired";
  if (ended) {
    await store.updateContractor(contractor.id, {
      subscriptionStatus: "canceled",
      plan: "free",
      stripeSubscriptionId: subscription.id,
    });
    return;
  }
  const priceId = subscription.items.data[0]?.price?.id;
  await store.updateContractor(contractor.id, {
    plan: planFromPrice(priceId) ?? knownPlan(subscription.metadata?.plan) ?? contractor.plan,
    subscriptionStatus:
      subscription.status === "past_due" || subscription.status === "unpaid" ? "past_due" : "active",
    stripeSubscriptionId: subscription.id,
    ...(customerId ? { stripeCustomerId: customerId } : {}),
  });
}
