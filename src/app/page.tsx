import Link from "next/link";
import { Suspense } from "react";
import { getCurrentContractor } from "@/lib/auth/current";
import { AUDIT_RESCUE_CENTS, PLANS } from "@/lib/domain/plans";
import { formatMoney } from "@/lib/domain/money";
import { enterDemo } from "@/server/actions";
import { Wordmark } from "@/components/wordmark";
import { isSupabaseConfigured } from "@/lib/env";

export const instant = false;

async function HeaderLinks() {
  const contractor = await getCurrentContractor();
  if (contractor) {
    return (
      <Link href="/app" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-sheet">
        Open workspace
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="px-3 py-2 text-sm font-semibold">
        Sign in
      </Link>
      <Link href="/signup" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-sheet">
        Start free
      </Link>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Import the subs you paid",
    body: "Drop in a vendor or 1099-style CSV from QuickBooks. Each sub gets a private upload link. They never need an account.",
  },
  {
    n: "02",
    title: "They send the ACORD 25",
    body: "A reader pulls carrier, policy numbers, GL, workers' comp, auto, umbrella, limits, dates, and additional-insured status. You confirm it before it counts.",
  },
  {
    n: "03",
    title: "See the audit bill early",
    body: "Green, amber, and red against your requirements. Uncovered dollars are payments on dates with no WC and GL in force — the figure an auditor can add to payroll.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      <header className="flex items-center justify-between py-5">
        <Wordmark />
        <Suspense fallback={<Link href="/login" className="text-sm font-semibold">Sign in</Link>}>
          <HeaderLinks />
        </Suspense>
      </header>

      <section className="grid items-end gap-10 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-copper">
            Eddy Woods LLC · for small general contractors
          </p>
          <h1 className="display mt-4 max-w-xl text-5xl leading-[0.95] text-ink sm:text-6xl">
            Know the audit bill before the auditor does.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft">
            When a subcontractor&apos;s certificate lapses, the dollars you already paid them can be added
            back to your workers&apos; comp payroll. AuditReady Subs keeps the certificates, prices the gap,
            and builds the packet.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-full bg-copper px-5 text-base font-semibold text-white">
              Start the 14-day Pro trial
            </Link>
            <Link href="/checker" className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-sheet px-5 text-base font-semibold">
              Check a certificate free
            </Link>
          </div>
          <p className="mt-3 text-sm text-ink-soft">No card for the trial. Three subs stay free after it ends.</p>
        </div>
        <aside className="sheet p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Workers&apos; comp exposure</p>
          <p className="display mt-3 text-5xl">$52,050</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Sample year for a five-sub remodeler. Paid on dates with no confirmed workers&apos; comp and
            general liability in force.
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between border-t border-line pt-3">
              <dt>Herrera Masonry</dt>
              <dd className="font-semibold text-pine">Covered after Jan 15</dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <dt>Lakeside Electric</dt>
              <dd className="font-semibold text-amber">Expires in 14 days</dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <dt>Pine &amp; Co. Roofing</dt>
              <dd className="font-semibold text-signal">$22,400 uncovered</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <article key={step.n} className="sheet p-5">
            <p className="text-xs font-semibold tracking-[0.16em] text-copper">{step.n}</p>
            <h2 className="display mt-3 text-2xl">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{step.body}</p>
          </article>
        ))}
      </section>

      <section id="pricing" className="mt-16">
        <h2 className="display text-4xl">Simple plans, counted in subs</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Every new account starts on a 14-day Pro trial. After that, the free plan holds 3 subcontractors.
          Reminders and the audit packet stay with a paid plan, the trial, or a one-time Audit Rescue.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <article key={plan.id} className="sheet flex flex-col p-5">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="display mt-2 text-4xl">
                {plan.monthlyCents === 0 ? "$0" : formatMoney(plan.monthlyCents).replace(".00", "")}
                {plan.monthlyCents > 0 ? <span className="text-base font-sans font-medium text-ink-soft">/mo</span> : null}
              </p>
              <p className="mt-2 text-sm text-ink-soft">{plan.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link href="/signup" className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-line text-sm font-semibold">
                {plan.id === "free" ? "Create a free account" : "Start with Pro, then choose"}
              </Link>
            </article>
          ))}
        </div>
        <article className="sheet mt-4 flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold">Audit Rescue · {formatMoney(AUDIT_RESCUE_CENTS).replace(".00", "")} once</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
              The auditor&apos;s letter already arrived. Buy the packet for the certificates you have on file
              without raising your subcontractor cap.
            </p>
          </div>
          <Link href="/signup" className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-sheet">
            Get the packet
          </Link>
        </article>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="display text-4xl">A certificate checker, no account</h2>
          <p className="mt-3 text-ink-soft leading-7">
            Upload one ACORD 25. See the dates, the lines of coverage, and the red flags a small GC usually
            cares about: missing workers&apos; comp, a limit under $1 million, an expiry inside 30 days, no
            additional insured. Then leave an email if you want the readout.
          </p>
          <Link href="/checker" className="mt-5 inline-flex h-11 items-center rounded-full bg-copper px-5 text-sm font-semibold text-white">
            Check a certificate
          </Link>
        </div>
        <div className="sheet p-5 text-sm leading-6">
          <h3 className="font-semibold">What this is not</h3>
          <p className="mt-2 text-ink-soft">
            AuditReady does not issue certificates, bind coverage, or replace your broker. You confirm every
            reading. Minnesota license lookup and a direct QuickBooks connection are not in this version —
            bring a CSV.
          </p>
          {!isSupabaseConfigured() ? (
            <form action={enterDemo} className="mt-4">
              <button type="submit" className="text-sm font-semibold text-copper underline-offset-4 hover:underline">
                Open the Northline Builders demo workspace
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-sm text-ink-soft">
        <p>AuditReady Subs is a record-keeping tool from Eddy Woods LLC.</p>
        <p className="mt-1">It does not provide insurance advice. Confirm certificates before you rely on them.</p>
      </footer>
    </div>
  );
}
