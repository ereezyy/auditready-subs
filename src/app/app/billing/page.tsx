import { requireContractor } from "@/lib/auth/current";
import { AUDIT_RESCUE_CENTS, PLANS } from "@/lib/domain/plans";
import { formatMoney } from "@/lib/domain/money";
import { stripeMode } from "@/lib/env";
import { loadWorkspace } from "@/lib/workspace";
import { startCheckout } from "@/server/actions";

export const instant = false;

export const metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const query = await searchParams;
  const contractor = await requireContractor();
  const workspace = await loadWorkspace(contractor);
  const mode = stripeMode();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-4xl">Billing</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {workspace.access.label}. {workspace.subs.length} subcontractors on file.
          {contractor.auditRescuePurchasedAt ? " Audit Rescue is on this account." : ""}
        </p>
      </div>
      {query.checkout === "success" ? <p className="form-ok">Plan updated. In test mode, no live charge was made.</p> : null}
      {query.checkout === "cancel" ? <p className="form-error">Checkout was canceled. The plan is unchanged.</p> : null}
      {mode === "mock" ? (
        <p className="text-sm text-ink-soft">
          No Stripe test key is set, so checkout is simulated. Nothing is charged and no live product is created.
        </p>
      ) : (
        <p className="text-sm text-ink-soft">Stripe is in test mode. Use a test card. Live keys are refused.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.filter((plan) => plan.id !== "free").map((plan) => (
          <article key={plan.id} className="sheet flex flex-col p-5">
            <h2 className="font-semibold">{plan.name}</h2>
            <p className="display mt-2 text-3xl">{formatMoney(plan.monthlyCents).replace(".00", "")}<span className="text-base font-sans text-ink-soft">/mo</span></p>
            <p className="mt-2 text-sm text-ink-soft">{plan.subLimit ?? "Unlimited"} subcontractors</p>
            <form action={startCheckout} className="mt-4">
              <input type="hidden" name="plan" value={plan.id} />
              <button type="submit" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-sheet">
                {workspace.access.planId === plan.id && workspace.access.paid ? "Current plan" : `Choose ${plan.name}`}
              </button>
            </form>
          </article>
        ))}
      </div>
      <article className="sheet flex flex-col justify-between gap-3 p-5 md:flex-row md:items-center">
        <div>
          <h2 className="font-semibold">Audit Rescue · {formatMoney(AUDIT_RESCUE_CENTS).replace(".00", "")} once</h2>
          <p className="text-sm text-ink-soft">Unlocks the audit packet without changing the subcontractor cap.</p>
        </div>
        <form action={startCheckout}>
          <input type="hidden" name="plan" value="audit_rescue" />
          <button type="submit" className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-semibold">
            {contractor.auditRescuePurchasedAt ? "Buy again" : "Buy Audit Rescue"}
          </button>
        </form>
      </article>
    </div>
  );
}
