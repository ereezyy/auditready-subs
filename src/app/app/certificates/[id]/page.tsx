import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContractor } from "@/lib/auth/current";
import { appNow } from "@/lib/clock";
import { assessExtraction } from "@/lib/domain/coverage";
import { todayIso } from "@/lib/domain/dates";
import {
  COVERAGE_LABEL,
  COVERAGE_TYPES,
  coverageByType,
  type CoverageType,
  type ParsedCoverage,
} from "@/lib/domain/types";
import { getStore } from "@/lib/store";
import { confirmCertificate } from "@/server/actions";

export const instant = false;

export const metadata = { title: "Review certificate" };

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const error = (await searchParams).error;
  const contractor = await requireContractor();
  const certificate = await getStore().getCertificate(contractor.id, id);
  if (!certificate) notFound();
  const sub = await getStore().getSub(contractor.id, certificate.subcontractorId);
  const source = certificate.confirmed
    ? {
        insuredName: certificate.confirmed.insuredName,
        additionalInsured: certificate.confirmed.additionalInsured,
        waiverOfSubrogation: certificate.confirmed.waiverOfSubrogation,
        coverages: certificate.confirmed.coverages,
        note: certificate.confirmed.note,
      }
    : certificate.extraction;
  const flags = certificate.extraction
    ? assessExtraction(certificate.extraction, contractor.requirements, todayIso(appNow()))
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="sheet overflow-hidden">
        {certificate.mimeType.startsWith("image/") ? (
          // User-uploaded certificates are served from an authenticated route.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${certificate.id}`} alt="Uploaded certificate" className="w-full" />
        ) : (
          <iframe title="Uploaded certificate" src={`/api/files/${certificate.id}`} className="h-[720px] w-full bg-white" />
        )}
      </section>
      <section>
        <p className="text-sm text-ink-soft">
          <Link href={sub ? `/app/subs/${sub.id}` : "/app"}>{sub?.name ?? "Subcontractor"}</Link>
        </p>
        <h1 className="display mt-1 text-4xl">Confirm the reading</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Nothing counts toward status or uncovered dollars until you confirm it. Correct anything the reader missed.
        </p>
        {certificate.extraction?.warnings.map((warning) => (
          <p key={warning} className="mt-3 text-sm text-amber">{warning}</p>
        ))}
        {flags.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {flags.map((flag) => (
              <li key={flag.text} className={flag.level === "red" ? "text-signal" : "text-ink-soft"}>
                {flag.text}
              </li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="form-error mt-4">{error}</p> : null}
        <form action={confirmCertificate} className="mt-5 space-y-4">
          <input type="hidden" name="certificateId" value={certificate.id} />
          <label className="block text-sm font-medium">
            Insured name
            <input name="insuredName" defaultValue={source?.insuredName ?? ""} required className="mt-1 h-10 w-full rounded-xl border border-line bg-sheet px-3 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="additionalInsured" defaultChecked={Boolean(source?.additionalInsured)} />
            Additional insured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="waiver" defaultChecked={Boolean(source?.waiverOfSubrogation)} />
            Waiver of subrogation
          </label>
          {COVERAGE_TYPES.map((type) => (
            <CoverageFields key={type} type={type} coverage={coverageByType(source?.coverages ?? [], type)} />
          ))}
          <label className="block text-sm font-medium">
            Note
            <textarea name="note" defaultValue={certificate.confirmed?.note ?? ""} className="mt-1 min-h-20 w-full rounded-xl border border-line bg-sheet px-3 py-2 text-sm" />
          </label>
          <button type="submit" className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-sheet">
            Confirm certificate
          </button>
        </form>
      </section>
    </div>
  );
}

function CoverageFields({ type, coverage }: { type: CoverageType; coverage: ParsedCoverage }) {
  return (
    <fieldset className="rounded-2xl border border-line p-3">
      <legend className="px-1 text-sm font-semibold">{COVERAGE_LABEL[type]}</legend>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name={`${type}_present`} defaultChecked={coverage.present} />
        On this certificate
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Text name={`${type}_carrier`} label="Carrier" defaultValue={coverage.carrier ?? ""} />
        <Text name={`${type}_policy`} label="Policy number" defaultValue={coverage.policyNumber ?? ""} />
        <Text name={`${type}_effective`} label="Effective" type="date" defaultValue={coverage.effective ?? ""} />
        <Text name={`${type}_expiry`} label="Expires" type="date" defaultValue={coverage.expiry ?? ""} />
        {type === "gl" || type === "umbrella" ? (
          <>
            <Text name={`${type}_each`} label="Each occurrence" defaultValue={coverage.limits.eachOccurrence?.toString() ?? ""} />
            <Text name={`${type}_aggregate`} label="Aggregate" defaultValue={coverage.limits.aggregate?.toString() ?? ""} />
          </>
        ) : null}
        {type === "wc" ? (
          <>
            <Text name={`${type}_accident`} label="Each accident" defaultValue={coverage.limits.eachAccident?.toString() ?? ""} />
            <Text name={`${type}_disease_employee`} label="Disease, each employee" defaultValue={coverage.limits.diseaseEachEmployee?.toString() ?? ""} />
            <Text name={`${type}_disease_policy`} label="Disease, policy" defaultValue={coverage.limits.diseasePolicy?.toString() ?? ""} />
          </>
        ) : null}
        {type === "auto" ? (
          <Text name={`${type}_csl`} label="Combined single limit" defaultValue={coverage.limits.combinedSingleLimit?.toString() ?? ""} />
        ) : null}
      </div>
    </fieldset>
  );
}

function Text({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue: string; type?: string }) {
  return (
    <label className="block text-xs font-medium text-ink-soft">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className="mt-1 h-9 w-full rounded-lg border border-line bg-sheet px-2 text-sm text-ink" />
    </label>
  );
}
