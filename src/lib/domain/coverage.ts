import { daysBetween, formatIsoDate } from "@/lib/domain/dates";
import type {
  ConfirmedCertificate,
  CoverageType,
  Extraction,
  Flag,
  GradeLevel,
  GradeReason,
  ParsedCoverage,
  Requirements,
  SubGrade,
} from "@/lib/domain/types";
import { COVERAGE_LABEL, coverageByType } from "@/lib/domain/types";

const RANK: Record<GradeLevel, number> = { green: 0, amber: 1, red: 2 };

function worst(reasons: GradeReason[]): GradeLevel {
  return reasons.reduce<GradeLevel>(
    (level, reason) => (RANK[reason.level] > RANK[level] ? reason.level : level),
    "green",
  );
}

function inForce(coverage: ParsedCoverage, day: string): boolean {
  if (!coverage.present || !coverage.effective || !coverage.expiry) return false;
  return coverage.effective <= day && day <= coverage.expiry;
}

function dateReasons(
  label: string,
  coverage: ParsedCoverage,
  today: string,
  warningDays: number,
): GradeReason[] {
  if (!coverage.effective || !coverage.expiry) {
    return [{ level: "red", text: `${label} is missing an effective or expiration date.` }];
  }
  if (coverage.expiry < today) {
    return [{ level: "red", text: `${label} expired ${formatIsoDate(coverage.expiry)}.` }];
  }
  if (coverage.effective > today) {
    return [
      {
        level: "amber",
        text: `${label} does not start until ${formatIsoDate(coverage.effective)}.`,
      },
    ];
  }
  const days = daysBetween(today, coverage.expiry);
  if (days <= warningDays) {
    return [
      {
        level: "amber",
        text: `${label} expires in ${days} day${days === 1 ? "" : "s"} (${formatIsoDate(coverage.expiry)}).`,
      },
    ];
  }
  return [];
}

type CertRecord = {
  status: "pending_review" | "confirmed" | "rejected";
  uploadedAt: string;
  confirmedAt: string | null;
  confirmed: ConfirmedCertificate | null;
};

function limitBelow(actual: number | null, required: number, label: string): GradeReason | null {
  if (required <= 0) return null;
  if ((actual ?? 0) < required) {
    return {
      level: "red",
      text: `${label} is below the required limit.`,
    };
  }
  return null;
}

export function gradeSub(input: {
  certificates: CertRecord[];
  requirements: Requirements;
  today: string;
}): SubGrade {
  const confirmed = input.certificates
    .filter((certificate) => certificate.status === "confirmed" && certificate.confirmed)
    .sort((a, b) => (b.confirmedAt ?? "").localeCompare(a.confirmedAt ?? ""))[0];
  const pending = input.certificates
    .filter((certificate) => certificate.status === "pending_review")
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];

  const reasons: GradeReason[] = [];

  if (!confirmed && pending) {
    reasons.push({
      level: "amber",
      text: "Certificate uploaded. Confirm the reading before it counts.",
    });
    return pack("amber", "Review", reasons, null, null);
  }
  if (!confirmed) {
    reasons.push({ level: "red", text: "No certificate on file." });
    return pack("red", "Gap", reasons, null, null);
  }

  const data = confirmed.confirmed as ConfirmedCertificate;
  const expiries: string[] = [];

  const checkLine = (
    type: CoverageType,
    required: boolean,
    limitChecks: { actual: number | null; required: number; label: string }[],
  ) => {
    const coverage = coverageByType(data.coverages, type);
    const label = COVERAGE_LABEL[type];
    if (!required) return;
    if (!coverage.present) {
      reasons.push({ level: "red", text: `${label} is missing.` });
      return;
    }
    for (const check of limitChecks) {
      const reason = limitBelow(check.actual, check.required, check.label);
      if (reason) reasons.push(reason);
    }
    const dated = dateReasons(label, coverage, input.today, input.requirements.warningDays);
    reasons.push(...dated);
    if (coverage.expiry) expiries.push(coverage.expiry);
  };

  const gl = coverageByType(data.coverages, "gl");
  checkLine("gl", true, [
    {
      actual: gl.limits.eachOccurrence,
      required: input.requirements.glEachOccurrence,
      label: "General liability each occurrence",
    },
    {
      actual: gl.limits.aggregate,
      required: input.requirements.glAggregate,
      label: "General liability aggregate",
    },
  ]);
  const wc = coverageByType(data.coverages, "wc");
  checkLine("wc", input.requirements.requireWc, [
    {
      actual: wc.limits.eachAccident,
      required: input.requirements.wcEachAccident,
      label: "Workers' comp each accident",
    },
  ]);
  const auto = coverageByType(data.coverages, "auto");
  checkLine("auto", input.requirements.requireAuto, [
    {
      actual: auto.limits.combinedSingleLimit,
      required: input.requirements.autoCombinedSingleLimit,
      label: "Automobile combined single limit",
    },
  ]);
  const umbrella = coverageByType(data.coverages, "umbrella");
  checkLine("umbrella", input.requirements.requireUmbrella, [
    {
      actual: umbrella.limits.eachOccurrence,
      required: input.requirements.umbrellaEachOccurrence,
      label: "Umbrella each occurrence",
    },
  ]);

  if (input.requirements.requireAdditionalInsured && !data.additionalInsured) {
    reasons.push({ level: "red", text: "Additional insured is not marked." });
  }
  if (input.requirements.requireWaiver && !data.waiverOfSubrogation) {
    reasons.push({ level: "red", text: "Waiver of subrogation is not marked." });
  }

  if (
    pending &&
    (!confirmed.confirmedAt || pending.uploadedAt > confirmed.confirmedAt)
  ) {
    reasons.push({
      level: "amber",
      text: "A newer certificate is waiting for review.",
    });
  }

  const soonest = expiries.sort()[0] ?? null;
  const days = soonest ? daysBetween(input.today, soonest) : null;
  const level = worst(reasons);
  if (level === "green") {
    reasons.push({ level: "green", text: "Required coverage is in force." });
  }
  const label =
    level === "green"
      ? "Covered"
      : level === "red"
        ? "Gap"
        : reasons.some((reason) => /waiting|Confirm the reading/.test(reason.text))
          ? "Review"
          : "Expiring";
  return pack(level, label, reasons, soonest, days);
}

function pack(
  level: GradeLevel,
  label: SubGrade["label"],
  reasons: GradeReason[],
  soonestExpiry: string | null,
  daysToExpiry: number | null,
): SubGrade {
  return { level, label, reasons, soonestExpiry, daysToExpiry };
}

export function lineInForce(coverage: ParsedCoverage, day: string): boolean {
  return inForce(coverage, day);
}

export function assessExtraction(
  extraction: Extraction,
  requirements: Requirements,
  today: string,
): Flag[] {
  const flags: Flag[] = [];
  if (extraction.confidence < 0.45) {
    flags.push({
      level: "amber",
      text: "This reading is thin. Compare it to the certificate before you rely on it.",
    });
  }
  const gl = coverageByType(extraction.coverages, "gl");
  const wc = coverageByType(extraction.coverages, "wc");
  if (!gl.present) {
    flags.push({ level: "red", text: "General liability was not found." });
  } else {
    if ((gl.limits.eachOccurrence ?? 0) < requirements.glEachOccurrence) {
      flags.push({
        level: "red",
        text: `General liability each occurrence is under $${requirements.glEachOccurrence.toLocaleString("en-US")}.`,
      });
    }
    if (gl.expiry && gl.expiry < today) {
      flags.push({ level: "red", text: `General liability expired ${formatIsoDate(gl.expiry)}.` });
    } else if (gl.expiry && daysBetween(today, gl.expiry) <= requirements.warningDays) {
      flags.push({
        level: "amber",
        text: `General liability expires ${formatIsoDate(gl.expiry)}.`,
      });
    }
    if (!gl.policyNumber) {
      flags.push({ level: "amber", text: "General liability policy number was not read." });
    }
  }
  if (requirements.requireWc && !wc.present) {
    flags.push({ level: "red", text: "Workers' compensation was not found." });
  } else if (wc.present && wc.expiry && wc.expiry < today) {
    flags.push({ level: "red", text: `Workers' compensation expired ${formatIsoDate(wc.expiry)}.` });
  } else if (
    wc.present &&
    wc.expiry &&
    daysBetween(today, wc.expiry) <= requirements.warningDays
  ) {
    flags.push({
      level: "amber",
      text: `Workers' compensation expires ${formatIsoDate(wc.expiry)}.`,
    });
  }
  if (requirements.requireAdditionalInsured && extraction.additionalInsured !== true) {
    flags.push({
      level: extraction.additionalInsured == null ? "amber" : "red",
      text:
        extraction.additionalInsured == null
          ? "Additional insured could not be read."
          : "Additional insured is not marked.",
    });
  }
  if (!extraction.waiverOfSubrogation) {
    flags.push({
      level: "info",
      text: "Waiver of subrogation is not marked. Many subcontracts ask for it.",
    });
  }
  if (flags.length === 0) {
    flags.push({
      level: "info",
      text: "No red flags against a typical small-GC requirement set. Still confirm the original.",
    });
  }
  return flags;
}
