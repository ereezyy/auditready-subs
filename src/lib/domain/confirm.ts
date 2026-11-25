import { parseDate } from "@/lib/domain/dates";
import { parseMoneyToCents } from "@/lib/domain/money";
import {
  COVERAGE_TYPES,
  type ConfirmedCertificate,
  type CoverageType,
  type ParsedCoverage,
  emptyLimits,
} from "@/lib/domain/types";

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function dollars(value: FormDataEntryValue | null): number | null {
  const cents = parseMoneyToCents(text(value));
  if (cents == null) return null;
  return Math.round(cents / 100);
}

function line(formData: FormData, type: CoverageType): ParsedCoverage {
  return {
    type,
    present: formData.get(`${type}_present`) === "on",
    carrier: text(formData.get(`${type}_carrier`)) || null,
    policyNumber: text(formData.get(`${type}_policy`)) || null,
    effective: parseDate(text(formData.get(`${type}_effective`))),
    expiry: parseDate(text(formData.get(`${type}_expiry`))),
    limits: {
      ...emptyLimits(),
      eachOccurrence: dollars(formData.get(`${type}_each`)),
      aggregate: dollars(formData.get(`${type}_aggregate`)),
      eachAccident: dollars(formData.get(`${type}_accident`)),
      diseaseEachEmployee: dollars(formData.get(`${type}_disease_employee`)),
      diseasePolicy: dollars(formData.get(`${type}_disease_policy`)),
      combinedSingleLimit: dollars(formData.get(`${type}_csl`)),
    },
  };
}

export function confirmedFromForm(formData: FormData): ConfirmedCertificate {
  return {
    insuredName: text(formData.get("insuredName")),
    additionalInsured: formData.get("additionalInsured") === "on",
    waiverOfSubrogation: formData.get("waiver") === "on",
    coverages: COVERAGE_TYPES.map((type) => line(formData, type)),
    note: text(formData.get("note")),
  };
}
