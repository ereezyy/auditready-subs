import JSZip from "jszip";
import { requireContractor } from "@/lib/auth/current";
import { coverageByType } from "@/lib/domain/types";
import { COVERAGE_TYPES } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/money";
import { renderPacketPdf } from "@/lib/pdf/packet";
import { getStore } from "@/lib/store";
import { loadWorkspace } from "@/lib/workspace";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sub";
}

export async function GET() {
  const contractor = await requireContractor();
  const workspace = await loadWorkspace(contractor);
  if (!workspace.access.canGeneratePacket) {
    return Response.json(
      { error: "The audit packet is included on a paid plan, the Pro trial, or Audit Rescue." },
      { status: 402 },
    );
  }
  const pdf = await renderPacketPdf({
    companyName: contractor.companyName,
    generatedOn: workspace.today,
    planLabel: workspace.access.label,
    requirementSummary: `General liability ${formatMoney(contractor.requirements.glEachOccurrence * 100)} / ${formatMoney(contractor.requirements.glAggregate * 100)}. Workers' comp ${contractor.requirements.requireWc ? "required" : "not required"}. Additional insured ${contractor.requirements.requireAdditionalInsured ? "required" : "not required"}.`,
    subs: workspace.subs.map((sub) => {
      const confirmed = workspace.certificates.find(
        (certificate) => certificate.subcontractorId === sub.id && certificate.status === "confirmed" && certificate.confirmed,
      );
      return {
        name: sub.name,
        trade: sub.trade,
        grade: workspace.grades.get(sub.id)!,
        windows: confirmed?.confirmed
          ? COVERAGE_TYPES.map((type) => coverageByType(confirmed.confirmed!.coverages, type))
              .filter((coverage) => coverage.present)
              .map((coverage) => ({
                type: coverage.type,
                policyNumber: coverage.policyNumber,
                effective: coverage.effective,
                expiry: coverage.expiry,
              }))
          : [],
      };
    }),
    report: workspace.report,
  });

  const zip = new JSZip();
  zip.file("audit-packet.pdf", pdf);
  const folder = zip.folder("certificates");
  const store = getStore();
  for (const certificate of workspace.certificates) {
    const sub = workspace.subs.find((item) => item.id === certificate.subcontractorId);
    const blob = await store.getBlob(certificate.blobId);
    if (!blob || !folder) continue;
    folder.file(`${slug(sub?.name ?? "sub")}-${certificate.filename}`, blob.bytes);
  }
  const summary = [
    "payee,date,amount,uncovered,reason",
    ...workspace.report.lines.map(
      (line) =>
        `"${line.payeeName.replace(/"/g, '""')}",${line.paidOn},${(line.amountCents / 100).toFixed(2)},${line.uncovered ? "yes" : "no"},"${line.reason.replace(/"/g, '""')}"`,
    ),
  ].join("\n");
  zip.file("payment-coverage.csv", summary);
  const archive = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `${slug(contractor.companyName)}-audit-packet.zip`;
  return new Response(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
