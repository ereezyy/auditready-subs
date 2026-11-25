import { applyStripeEvent, getStripe } from "@/lib/stripe/billing";
import { stripeMode } from "@/lib/env";

export async function POST(request: Request) {
  if (stripeMode() !== "test") {
    return Response.json({ error: "Stripe test mode is not configured." }, { status: 400 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return Response.json({ error: "Missing Stripe webhook secret or signature." }, { status: 400 });
  }
  const stripe = getStripe();
  const body = await request.text();
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    await applyStripeEvent(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook.";
    return Response.json({ error: message }, { status: 400 });
  }
  return Response.json({ received: true });
}
