import { notFound, redirect } from "next/navigation";
import { requireContractor } from "@/lib/auth/current";
import { stripeMode } from "@/lib/env";
import { amountLabel } from "@/lib/stripe/billing";
import { completeMockCheckout } from "@/server/actions";

export const instant = false;

export const metadata = { title: "Test checkout" };

const PLANS = new Set(["starter", "pro", "plus", "audit_rescue"]);

export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  if (stripeMode() !== "mock") redirect("/app/billing");
  await requireContractor();
  const plan = (await searchParams).plan ?? "";
  if (!PLANS.has(plan)) notFound();
  const label = amountLabel(plan as "starter" | "pro" | "plus" | "audit_rescue");

  return (
    <div className="mx-auto max-w-lg">
      <div className="sheet p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">Simulated Stripe test checkout</p>
        <h1 className="display mt-3 text-4xl">{plan === "audit_rescue" ? "Audit Rescue" : plan}</h1>
        <p className="mt-2 text-2xl font-semibold">{label}</p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          This is not Stripe. No card number is collected and no test product is created. Completing it writes
          the plan onto this local account so you can see the limits change.
        </p>
        <form action={completeMockCheckout} className="mt-5">
          <input type="hidden" name="plan" value={plan} />
          <button type="submit" className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-sheet">
            Complete test payment
          </button>
        </form>
      </div>
    </div>
  );
}
