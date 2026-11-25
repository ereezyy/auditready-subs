import { requireContractor } from "@/lib/auth/current";
import { formatIsoDate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { loadWorkspace } from "@/lib/workspace";
import { importPayments } from "@/server/actions";
import { BoundForm } from "@/components/bound-form";
import { SubmitButton } from "@/components/submit-button";
import { Input, Label } from "@/components/ui/input";

export const instant = false;

export const metadata = { title: "Uncovered dollars" };

export default async function ReportPage() {
  const contractor = await requireContractor();
  const workspace = await loadWorkspace(contractor);
  const report = workspace.report;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-4xl">Uncovered dollars</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">
          A payment counts when that sub had no confirmed workers&apos; comp and general liability in force
          on the day you paid them. Pending certificates do not count. The payroll add-back is the portion
          with no workers&apos; comp — the amount an auditor can add to your payroll.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="sheet p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Uncovered</p>
          <p className="display mt-1 text-3xl">{formatMoney(report.uncoveredCents)}</p>
        </article>
        <article className="sheet p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Payroll add-back</p>
          <p className="display mt-1 text-3xl">{formatMoney(report.uncoveredWcCents)}</p>
        </article>
        <article className="sheet p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Paid in this file</p>
          <p className="display mt-1 text-3xl">{formatMoney(report.totalPaidCents)}</p>
        </article>
      </section>

      <section className="sheet p-5">
        <h2 className="font-semibold">Replace payments</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Importing replaces the previous payment file. Columns: vendor, date, amount. Memo is optional.
        </p>
        <p className="mt-2 text-sm">
          <a className="font-semibold text-copper" href="/api/samples/payments.csv">Download the sample payments CSV</a>
        </p>
        <BoundForm action={importPayments} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="file">Payments CSV</Label>
            <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
          </div>
          <SubmitButton pendingLabel="Importing…">Run the report</SubmitButton>
        </BoundForm>
      </section>

      {report.lines.length === 0 ? (
        <p className="text-sm text-ink-soft">No payments imported yet.</p>
      ) : (
        <div className="sheet overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Payee</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">WC</th>
                <th className="px-4 py-3 font-semibold">GL</th>
                <th className="px-4 py-3 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((line) => (
                <tr key={`${line.payeeName}-${line.paidOn}-${line.amountCents}`} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">{line.matchedName ?? line.payeeName}</td>
                  <td className="px-4 py-3">{formatIsoDate(line.paidOn)}</td>
                  <td className={`px-4 py-3 font-semibold ${line.uncovered ? "text-signal" : "text-pine"}`}>
                    {formatMoney(line.amountCents)}
                  </td>
                  <td className="px-4 py-3">{line.wcInForce ? "In force" : "No"}</td>
                  <td className="px-4 py-3">{line.glInForce ? "In force" : "No"}</td>
                  <td className="px-4 py-3 text-ink-soft">{line.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
