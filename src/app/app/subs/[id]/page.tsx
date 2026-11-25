import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContractor } from "@/lib/auth/current";
import { appUrl } from "@/lib/clock";
import { formatIsoDate } from "@/lib/domain/dates";
import { getStore } from "@/lib/store";
import { loadWorkspace } from "@/lib/workspace";
import { deleteSub, updateSub } from "@/server/actions";
import { BoundForm } from "@/components/bound-form";
import { CopyLink } from "@/components/copy-link";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { Input, Label } from "@/components/ui/input";

export const instant = false;

export const metadata = { title: "Subcontractor" };

export default async function SubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const notice = (await searchParams).notice;
  const contractor = await requireContractor();
  const sub = await getStore().getSub(contractor.id, id);
  if (!sub) notFound();
  const workspace = await loadWorkspace(contractor);
  const grade = workspace.grades.get(sub.id);
  const certificates = workspace.certificates.filter((certificate) => certificate.subcontractorId === sub.id);
  const uploadUrl = `${appUrl()}/upload/${sub.uploadToken}`;

  return (
    <div className="space-y-6">
      {notice ? <p className="form-ok">{notice}</p> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">
            <Link href="/app">All subs</Link>
          </p>
          <h1 className="display mt-1 text-4xl">{sub.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">{sub.trade || "Trade not set"}</p>
        </div>
        {grade ? <StatusPill level={grade.level} label={grade.label} /> : null}
      </div>
      {grade ? (
        <ul className="space-y-1 text-sm text-ink-soft">
          {grade.reasons.map((reason) => (
            <li key={reason.text}>{reason.text}</li>
          ))}
        </ul>
      ) : null}

      <section className="sheet p-5">
        <h2 className="font-semibold">Upload link</h2>
        <p className="mt-1 text-sm text-ink-soft">Send this to the sub. It does not show your other subcontractors.</p>
        <CopyLink url={uploadUrl} />
      </section>

      <section className="sheet p-5">
        <h2 className="font-semibold">Certificates</h2>
        {certificates.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nothing uploaded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {certificates.map((certificate) => (
              <li key={certificate.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{certificate.filename}</p>
                  <p className="text-ink-soft">
                    {certificate.status === "confirmed" ? "Confirmed" : certificate.status === "pending_review" ? "Waiting for review" : "Rejected"}{" "}
                    · {formatIsoDate(certificate.uploadedAt.slice(0, 10))}
                  </p>
                </div>
                <Link href={`/app/certificates/${certificate.id}`} className="font-semibold text-copper">
                  {certificate.status === "confirmed" ? "View reading" : "Review"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sheet p-5">
        <h2 className="font-semibold">Details</h2>
        <BoundForm action={updateSub.bind(null, sub.id)} className="mt-4 grid gap-3 md:grid-cols-2">
          <Field name="name" label="Name" defaultValue={sub.name} required />
          <Field name="trade" label="Trade" defaultValue={sub.trade} />
          <Field name="email" label="Email" defaultValue={sub.email} type="email" />
          <Field name="phone" label="Phone" defaultValue={sub.phone} />
          <Field name="agentName" label="Insurance agent" defaultValue={sub.agentName} />
          <Field name="agentEmail" label="Agent email" defaultValue={sub.agentEmail} type="email" />
          <div className="md:col-span-2">
            <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
          </div>
        </BoundForm>
        <form action={deleteSub.bind(null, sub.id)} className="mt-4">
          <button type="submit" className="text-sm font-semibold text-signal">
            Remove this subcontractor
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
