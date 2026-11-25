import Link from "next/link";
import { Suspense } from "react";
import { getStore } from "@/lib/store";
import { Wordmark } from "@/components/wordmark";

export const instant = false;

async function UploadBody({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const sub = await getStore().getSubByToken(token);
  if (!sub) {
    return (
      <div className="sheet p-6">
        <h1 className="display text-3xl">This link is not active</h1>
        <p className="mt-2 text-sm text-ink-soft">Ask the contractor for a new upload link.</p>
      </div>
    );
  }
  const contractor = await getStore().findContractorById(sub.contractorId);
  return (
    <div className="sheet p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">Certificate request</p>
      <h1 className="display mt-2 text-4xl">{sub.name}</h1>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {contractor?.companyName ?? "Your contractor"} asked for a current ACORD 25. No account is required.
        Upload the PDF or a clear photo. They review it before it counts.
      </p>
      {query.uploaded ? (
        <p className="form-ok mt-4">Received. {contractor?.companyName ?? "The contractor"} will confirm the reading.</p>
      ) : null}
      {query.error ? <p className="form-error mt-4">{query.error}</p> : null}
      <form action={`/api/upload/${token}`} method="post" encType="multipart/form-data" className="mt-5 space-y-4">
        <label className="block text-sm font-medium" htmlFor="file">
          Certificate file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="block w-full text-sm"
        />
        <button type="submit" className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-sheet">
          Upload certificate
        </button>
      </form>
    </div>
  );
}

export default function UploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Wordmark />
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-ink-soft">Opening the upload link…</p>}>
          <UploadBody params={params} searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-4 text-xs text-ink-soft">
        <Link href="/">AuditReady Subs</Link> stores the file for the contractor who sent this link.
      </p>
    </div>
  );
}
