import "server-only";
import { cache } from "react";
import { appNow } from "@/lib/clock";
import { gradeSub } from "@/lib/domain/coverage";
import { todayIso } from "@/lib/domain/dates";
import { effectiveAccess } from "@/lib/domain/plans";
import { uncoveredDollars } from "@/lib/domain/uncovered";
import { getStore } from "@/lib/store";
import type { CertificateRecord, ContractorRecord } from "@/lib/store/types";

function gradeInput(certificate: CertificateRecord) {
  return {
    status: certificate.status,
    uploadedAt: certificate.uploadedAt,
    confirmedAt: certificate.confirmedAt,
    confirmed: certificate.confirmed,
  };
}

export const loadWorkspace = cache(async function loadWorkspace(contractor: ContractorRecord) {
  const store = getStore();
  const subs = await store.listSubs(contractor.id);
  const certificates = await store.listCertificates(contractor.id);
  const payments = await store.listPayments(contractor.id);
  const today = todayIso(appNow());
  const access = effectiveAccess(contractor, appNow());
  const grades = new Map(
    subs.map((sub) => [
      sub.id,
      gradeSub({
        certificates: certificates
          .filter((certificate) => certificate.subcontractorId === sub.id)
          .map(gradeInput),
        requirements: contractor.requirements,
        today,
      }),
    ]),
  );
  const report = uncoveredDollars(
    payments.map((payment) => ({
      payeeName: payment.payeeName,
      amountCents: payment.amountCents,
      paidOn: payment.paidOn,
    })),
    subs.map((sub) => ({ id: sub.id, name: sub.name })),
    certificates
      .filter((certificate) => certificate.status === "confirmed" && certificate.confirmed)
      .map((certificate) => ({
        subcontractorId: certificate.subcontractorId,
        confirmed: certificate.confirmed!,
      })),
  );
  return { subs, certificates, payments, today, access, grades, report };
});
