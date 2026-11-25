import "server-only";
import { appNow, appUrl } from "@/lib/clock";
import { todayIso } from "@/lib/domain/dates";
import { gradeSub } from "@/lib/domain/coverage";
import { dueMilestone } from "@/lib/domain/reminders";
import { effectiveAccess } from "@/lib/domain/plans";
import { reminderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { getStore } from "@/lib/store";
import type { CertificateRecord, ContractorRecord } from "@/lib/store/types";

function holderBlock(contractor: ContractorRecord): string {
  return [
    contractor.companyName,
    contractor.address1,
    [contractor.city, contractor.state, contractor.postalCode].filter(Boolean).join(" "),
  ]
    .filter((line) => line && line.trim())
    .join("\n");
}

function asGradeCert(certificate: CertificateRecord) {
  return {
    status: certificate.status,
    uploadedAt: certificate.uploadedAt,
    confirmedAt: certificate.confirmedAt,
    confirmed: certificate.confirmed,
  };
}

export async function sendDueReminders(contractorId?: string): Promise<{ sent: number; skipped: number }> {
  const store = getStore();
  const contractors = contractorId
    ? [await store.findContractorById(contractorId)].filter((row): row is ContractorRecord => Boolean(row))
    : await store.listContractors();
  const today = todayIso(appNow());
  let sent = 0;
  let skipped = 0;

  for (const contractor of contractors) {
    const access = effectiveAccess(contractor, appNow());
    if (!access.canSendReminders) {
      skipped += 1;
      continue;
    }
    const subs = await store.listSubs(contractor.id);
    const certificates = await store.listCertificates(contractor.id);
    const reminders = await store.listReminders(contractor.id);
    for (const sub of subs) {
      const own = certificates.filter((certificate) => certificate.subcontractorId === sub.id);
      const grade = gradeSub({
        certificates: own.map(asGradeCert),
        requirements: contractor.requirements,
        today,
      });
      if (grade.daysToExpiry == null || !grade.soonestExpiry || grade.daysToExpiry < 0) continue;
      const already = reminders
        .filter(
          (reminder) =>
            reminder.subcontractorId === sub.id && reminder.expiryDate === grade.soonestExpiry,
        )
        .map((reminder) => reminder.milestone);
      const milestone = dueMilestone(grade.daysToExpiry, already);
      if (milestone == null) continue;
      const current = own.find((certificate) => certificate.status === "confirmed");
      const message = reminderEmail({
        companyName: contractor.companyName,
        holderBlock: holderBlock(contractor),
        subName: sub.name,
        expiry: grade.soonestExpiry,
        daysLeft: grade.daysToExpiry,
        milestone,
        uploadUrl: `${appUrl()}/upload/${sub.uploadToken}`,
        requirements: contractor.requirements,
      });
      const toEmail = sub.email || contractor.email;
      const copies = [sub.agentEmail, sub.email ? contractor.email : ""]
        .map((value) => value.trim())
        .filter((value) => value && value.toLowerCase() !== toEmail.toLowerCase());
      await sendEmail({
        contractorId: contractor.id,
        toEmail,
        ccEmail: copies.length ? copies.join(", ") : null,
        subject: message.subject,
        body: message.body,
      });
      await store.addReminder({
        contractorId: contractor.id,
        subcontractorId: sub.id,
        certificateId: current?.id ?? null,
        milestone,
        expiryDate: grade.soonestExpiry,
      });
      sent += 1;
    }
  }
  return { sent, skipped };
}
