import { requireContractor } from "@/lib/auth/current";
import { isSupabaseConfigured } from "@/lib/env";
import { resetDemo, saveSettings } from "@/server/actions";
import { BoundForm } from "@/components/bound-form";
import { SubmitButton } from "@/components/submit-button";
import { Input, Label } from "@/components/ui/input";

export const instant = false;

export const metadata = { title: "Requirements" };

export default async function SettingsPage() {
  const contractor = await requireContractor();
  const rules = contractor.requirements;
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="display text-4xl">Requirements</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          A certificate is graded against these rules. They are your job requirements, not a coverage opinion.
          The certificate holder block is what reminders ask the agent to print.
        </p>
      </div>
      <BoundForm action={saveSettings} className="sheet space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field name="contactName" label="Your name" defaultValue={contractor.contactName} />
          <Field name="companyName" label="Company" defaultValue={contractor.companyName} />
          <Field name="address1" label="Street" defaultValue={contractor.address1} />
          <Field name="city" label="City" defaultValue={contractor.city} />
          <Field name="state" label="State" defaultValue={contractor.state} />
          <Field name="postalCode" label="Postal code" defaultValue={contractor.postalCode} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field name="glEachOccurrence" label="GL each occurrence ($)" defaultValue={String(rules.glEachOccurrence)} />
          <Field name="glAggregate" label="GL aggregate ($)" defaultValue={String(rules.glAggregate)} />
          <Field name="wcEachAccident" label="WC each accident ($)" defaultValue={String(rules.wcEachAccident)} />
          <Field name="autoCombinedSingleLimit" label="Auto combined single limit ($)" defaultValue={String(rules.autoCombinedSingleLimit)} />
          <Field name="umbrellaEachOccurrence" label="Umbrella each occurrence ($)" defaultValue={String(rules.umbrellaEachOccurrence)} />
          <Field name="warningDays" label="Warn this many days before expiry" defaultValue={String(rules.warningDays)} />
        </div>
        <div className="grid gap-2 text-sm">
          <Check name="requireWc" label="Workers' compensation required" defaultChecked={rules.requireWc} />
          <Check name="requireAuto" label="Automobile liability required" defaultChecked={rules.requireAuto} />
          <Check name="requireUmbrella" label="Umbrella required" defaultChecked={rules.requireUmbrella} />
          <Check name="requireAdditionalInsured" label="Additional insured required" defaultChecked={rules.requireAdditionalInsured} />
          <Check name="requireWaiver" label="Waiver of subrogation required" defaultChecked={rules.requireWaiver} />
        </div>
        <SubmitButton pendingLabel="Saving…">Save requirements</SubmitButton>
      </BoundForm>
      {!isSupabaseConfigured() ? (
        <form action={resetDemo} className="text-sm">
          <button type="submit" className="font-semibold text-signal">
            Erase local data and restore the Northline demo
          </button>
        </form>
      ) : null}
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
