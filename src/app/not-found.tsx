import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="display text-4xl">That page is not here</h1>
      <p className="mt-2 text-sm text-ink-soft">The link may be old, or the subcontractor was removed.</p>
      <Link href="/app" className="mt-4 inline-flex text-sm font-semibold text-copper">
        Back to subcontractors
      </Link>
    </div>
  );
}
