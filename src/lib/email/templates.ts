import { formatLimit } from "@/lib/domain/money";
import type { Requirements } from "@/lib/domain/types";
import { formatIsoDate } from "@/lib/domain/dates";

export function reminderEmail(input: {
  companyName: string;
  holderBlock: string;
  subName: string;
  expiry: string;
  daysLeft: number;
  milestone: number;
  uploadUrl: string;
  requirements: Requirements;
}): { subject: string; body: string } {
  const when =
    input.milestone === 0
      ? `expires today (${formatIsoDate(input.expiry)})`
      : `expires in ${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"} (${formatIsoDate(input.expiry)})`;
  const subject =
    input.milestone === 0
      ? `Certificate of insurance expires today — ${input.subName}`
      : `Certificate of insurance expiring — ${input.subName} (${input.milestone}-day notice)`;

  const lines = [
    `Hello,`,
    ``,
    `${input.companyName} needs a current certificate of insurance on file before the next payment. The certificate for ${input.subName} ${when}.`,
    ``,
    `Please send an updated ACORD 25 with:`,
    ``,
    `- Commercial general liability: ${formatLimit(input.requirements.glEachOccurrence)} each occurrence / ${formatLimit(input.requirements.glAggregate)} aggregate`,
  ];
  if (input.requirements.requireWc) {
    lines.push(
      `- Workers' compensation: statutory limits, employers' liability ${formatLimit(input.requirements.wcEachAccident)} each accident`,
    );
  }
  if (input.requirements.requireAuto) {
    lines.push(
      `- Automobile liability: ${formatLimit(input.requirements.autoCombinedSingleLimit)} combined single limit`,
    );
  }
  if (input.requirements.requireUmbrella) {
    lines.push(`- Umbrella: ${formatLimit(input.requirements.umbrellaEachOccurrence)} each occurrence`);
  }
  if (input.requirements.requireAdditionalInsured) {
    lines.push(`- Additional insured: ${input.companyName} listed as additional insured on the general liability policy`);
  }
  if (input.requirements.requireWaiver) {
    lines.push(`- Waiver of subrogation in favor of ${input.companyName}`);
  }
  lines.push(
    ``,
    `Upload it here. No account is required:`,
    input.uploadUrl,
    ``,
    `Certificate holder:`,
    input.holderBlock,
    ``,
    `Please reply on the certificate, not with a binder or an email that coverage is "being renewed."`,
    ``,
    `Thank you,`,
    input.companyName,
  );
  return { subject, body: lines.join("\n") };
}
