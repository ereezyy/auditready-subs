import Link from "next/link";
import { requireContractor } from "@/lib/auth/current";
import { loadWorkspace } from "@/lib/workspace";

export const instant = false;

export const metadata = { title: "Audit packet" };

export default async function PacketPage() {
  const contractor = await requireContractor();
  const workspace = await loadWorkspace(contractor);
  const confirmed = workspace.certificates.filter((certificate) => certificate.status === "confirmed").length;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="display text-4xl">Audit packet</h1>
      <p className="text-sm leading-6 text-ink-soft">
        One zip: a PDF coverage timeline, a CSV of which payments were uncovered, and every certificate file
        on record. {confirmed} confirmed certificate{confirmed === 1 ? "" : "s"} will be included.
      </p>
      {workspace.access.canGeneratePacket ? (
        <a href="/api/audit-packet" className="inline-flex h-11 items-center rounded-full bg-copper px-5 text-sm font-semibold text-white">
          Download audit packet
        </a>
      ) : (
        <div className="sheet p-5">
          <p className="text-sm leading-6">
            The packet is included on the Pro trial, a paid plan, or the one-time Audit Rescue.
          </p>
          <Link href="/app/billing" className="mt-3 inline-flex text-sm font-semibold text-copper">
            See plans
          </Link>
        </div>
      )}
    </div>
  );
}
