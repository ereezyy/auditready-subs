import Link from "next/link";
import { requireContractor } from "@/lib/auth/current";
import { formatMoney } from "@/lib/domain/money";
import { formatIsoDate } from "@/lib/domain/dates";
import { loadWorkspace } from "@/lib/workspace";
import { StatusPill } from "@/components/status-pill";
import { appUrl } from "@/lib/clock";

export const instant = false;

export const metadata = { title: "Subs" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const contractor = await requireContractor();
  const workspace = await loadWorkspace(contractor);
  const notice = (await searchParams).notice;
  const attention = [...workspace.grades.values()].filter((grade) => grade.level !== "green").length;
  const expiring = [...workspace.grades.values()].filter(
    (grade) => grade.daysToExpiry != null && grade.daysToExpiry >= 0 && grade.daysToExpiry <= 30,
  ).length;

  return (
    <div className="space-y-6">
      {notice ? <p className="form-ok">{notice}</p> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Subcontractors</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Status follows the newest certificate you confirmed. {workspace.subs.length} of{" "}
            {workspace.access.unlimited ? "unlimited" : workspace.access.subLimit} on this plan.
          </p>
        </div>
        <Link href="/app/import" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-sheet">
          Import or add
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="On file" value={String(workspace.subs.length)} />
        <Stat label="Need attention" value={String(attention)} />
        <Stat label="Inside 30 days" value={String(expiring)} />
        <Stat label="Uncovered dollars" value={formatMoney(workspace.report.uncoveredCents)} />
      </section>

      {workspace.subs.length === 0 ? (
        <div className="sheet p-8">
          <h2 className="display text-3xl">No subcontractors yet</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink-soft">
            Import the vendor CSV from QuickBooks or add the first sub. They will get a link to upload their
            own certificate.
          </p>
          <Link href="/app/import" className="mt-4 inline-flex h-10 items-center rounded-full bg-copper px-4 text-sm font-semibold text-white">
            Import a CSV
          </Link>
        </div>
      ) : (
        <div className="sheet overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft md:grid">
            <span>Subcontractor</span>
            <span>Status</span>
            <span>Expires</span>
            <span>Upload link</span>
          </div>
          <ul>
            {workspace.subs.map((sub) => {
              const grade = workspace.grades.get(sub.id)!;
              return (
                <li key={sub.id} className="border-b border-line px-4 py-4 last:border-b-0">
                  <div className="grid gap-2 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr] md:items-center">
                    <div>
                      <Link href={`/app/subs/${sub.id}`} className="font-semibold hover:text-copper">
                        {sub.name}
                      </Link>
                      <p className="text-sm text-ink-soft">{sub.trade || "Trade not set"}</p>
                    </div>
                    <div>
                      <StatusPill level={grade.level} label={grade.label} />
                      <p className="mt-1 text-xs text-ink-soft">{grade.reasons[0]?.text}</p>
                    </div>
                    <p className="text-sm">{formatIsoDate(grade.soonestExpiry)}</p>
                    <a className="text-sm font-semibold text-copper" href={`${appUrl()}/upload/${sub.uploadToken}`}>
                      Open upload link
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="sheet p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="display mt-1 text-3xl">{value}</p>
    </article>
  );
}
