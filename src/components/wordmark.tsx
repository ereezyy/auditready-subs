import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-ink">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-[11px] font-semibold tracking-wide text-sheet">
        AR
      </span>
      <span className="leading-tight">
        <span className="display block text-lg">AuditReady</span>
        <span className="block text-[11px] uppercase tracking-[0.16em] text-ink-soft">Subs</span>
      </span>
    </Link>
  );
}
