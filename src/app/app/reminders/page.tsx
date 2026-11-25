import { requireContractor } from "@/lib/auth/current";
import { formatIsoDate } from "@/lib/domain/dates";
import { dueMilestone } from "@/lib/domain/reminders";
import { getStore } from "@/lib/store";
import { loadWorkspace } from "@/lib/workspace";
import { runReminders } from "@/server/actions";

export const instant = false;

export const metadata = { title: "Reminders" };

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const query = await searchParams;
  const contractor = await requireContractor();
  const workspace = await loadWorkspace(contractor);
  const reminders = await getStore().listReminders(contractor.id);
  const outbox = await getStore().listOutbox(contractor.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Renewal reminders</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Sent at 30, 14, 7, and 0 days. The note asks for the limits in your requirements and includes the
            upload link. The sub&apos;s agent is copied when you have their email. Vercel Cron calls this daily;
            you can run anything due right now.
          </p>
        </div>
        <form action={runReminders}>
          <button
            type="submit"
            disabled={!workspace.access.canSendReminders}
            className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-sheet disabled:opacity-50"
          >
            Send due reminders
          </button>
        </form>
      </div>
      {!workspace.access.canSendReminders ? (
        <p className="form-error">Reminders send during the Pro trial and on a paid plan.</p>
      ) : null}
      {query.error === "plan" ? <p className="form-error">This plan cannot send reminders.</p> : null}
      {query.sent ? <p className="form-ok">Sent {query.sent} reminder{query.sent === "1" ? "" : "s"}.</p> : null}

      <section className="sheet overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-semibold">Sub</th>
              <th className="px-4 py-3 font-semibold">Expires</th>
              <th className="px-4 py-3 font-semibold">Next notice</th>
              <th className="px-4 py-3 font-semibold">Agent</th>
            </tr>
          </thead>
          <tbody>
            {workspace.subs.map((sub) => {
              const grade = workspace.grades.get(sub.id)!;
              const sent = reminders
                .filter((reminder) => reminder.subcontractorId === sub.id && reminder.expiryDate === grade.soonestExpiry)
                .map((reminder) => reminder.milestone);
              const next = grade.daysToExpiry == null ? null : dueMilestone(grade.daysToExpiry, sent);
              return (
                <tr key={sub.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">{sub.name}</td>
                  <td className="px-4 py-3">{formatIsoDate(grade.soonestExpiry)}</td>
                  <td className="px-4 py-3">{next == null ? "None due" : `${next}-day notice`}</td>
                  <td className="px-4 py-3">{sub.agentEmail || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Outbox</h2>
        {outbox.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing sent yet. Lakeside&apos;s sample certificate is inside the 14-day window, so a due run writes that note here.</p>
        ) : (
          outbox.map((message) => (
            <article key={message.id} className="sheet p-4">
              <p className="text-xs text-ink-soft">{new Date(message.createdAt).toLocaleString()}</p>
              <h3 className="mt-1 font-semibold">{message.subject}</h3>
              <p className="text-sm text-ink-soft">To {message.toEmail}{message.ccEmail ? ` · Cc ${message.ccEmail}` : ""}</p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6">{message.body}</pre>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
