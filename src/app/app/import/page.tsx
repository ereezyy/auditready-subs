import { BoundForm } from "@/components/bound-form";
import { SubmitButton } from "@/components/submit-button";
import { Input, Label } from "@/components/ui/input";
import { addSub, importSubs } from "@/server/actions";

export const instant = false;

export const metadata = { title: "Import subs" };

export default function ImportPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="sheet p-5">
        <h1 className="display text-3xl">Import a vendor CSV</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Use a header row. A name column is required — Vendor, Subcontractor, or Company all work. Email,
          phone, trade, agent name, and agent email are optional and used for reminders.
        </p>
        <p className="mt-2 text-sm">
          <a className="font-semibold text-copper" href="/api/samples/subs.csv">
            Download the sample subs CSV
          </a>
        </p>
        <BoundForm action={importSubs} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="file">CSV file</Label>
            <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
          </div>
          <SubmitButton pendingLabel="Importing…">Import subcontractors</SubmitButton>
        </BoundForm>
      </section>
      <section className="sheet p-5">
        <h2 className="display text-3xl">Add one sub</h2>
        <BoundForm action={addSub} className="mt-4 space-y-3">
          <Field name="name" label="Name" required />
          <Field name="trade" label="Trade" />
          <Field name="email" label="Email" type="email" />
          <Field name="phone" label="Phone" />
          <Field name="agentName" label="Insurance agent" />
          <Field name="agentEmail" label="Agent email" type="email" />
          <SubmitButton pendingLabel="Adding…">Add subcontractor</SubmitButton>
        </BoundForm>
      </section>
    </div>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
