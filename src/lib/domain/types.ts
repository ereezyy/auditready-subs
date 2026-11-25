export type CoverageType = "gl" | "wc" | "auto" | "umbrella";

export type PlanId = "free" | "starter" | "pro" | "plus";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type Limits = {
  eachOccurrence: number | null;
  aggregate: number | null;
  eachAccident: number | null;
  diseaseEachEmployee: number | null;
  diseasePolicy: number | null;
  combinedSingleLimit: number | null;
};

export type ParsedCoverage = {
  type: CoverageType;
  present: boolean;
  carrier: string | null;
  policyNumber: string | null;
  effective: string | null;
  expiry: string | null;
  limits: Limits;
};

export type ExtractionSource = "vision" | "text" | "mock";

export type Extraction = {
  insuredName: string | null;
  certificateHolder: string | null;
  producerName: string | null;
  producerEmail: string | null;
  additionalInsured: boolean | null;
  waiverOfSubrogation: boolean | null;
  description: string | null;
  coverages: ParsedCoverage[];
  confidence: number;
  source: ExtractionSource;
  warnings: string[];
};

export type ConfirmedCertificate = {
  insuredName: string;
  additionalInsured: boolean;
  waiverOfSubrogation: boolean;
  coverages: ParsedCoverage[];
  note: string;
};

export type Requirements = {
  glEachOccurrence: number;
  glAggregate: number;
  requireWc: boolean;
  wcEachAccident: number;
  requireAuto: boolean;
  autoCombinedSingleLimit: number;
  requireUmbrella: boolean;
  umbrellaEachOccurrence: number;
  requireAdditionalInsured: boolean;
  requireWaiver: boolean;
  warningDays: number;
};

export type GradeLevel = "green" | "amber" | "red";

export type GradeReason = {
  level: GradeLevel;
  text: string;
};

export type SubGrade = {
  level: GradeLevel;
  label: "Covered" | "Expiring" | "Review" | "Gap";
  reasons: GradeReason[];
  soonestExpiry: string | null;
  daysToExpiry: number | null;
};

export type Flag = {
  level: "red" | "amber" | "info";
  text: string;
};

export const COVERAGE_TYPES: CoverageType[] = ["gl", "wc", "auto", "umbrella"];

export const COVERAGE_LABEL: Record<CoverageType, string> = {
  gl: "General liability",
  wc: "Workers' compensation",
  auto: "Automobile liability",
  umbrella: "Umbrella",
};

export function emptyLimits(): Limits {
  return {
    eachOccurrence: null,
    aggregate: null,
    eachAccident: null,
    diseaseEachEmployee: null,
    diseasePolicy: null,
    combinedSingleLimit: null,
  };
}

export function emptyCoverage(type: CoverageType): ParsedCoverage {
  return {
    type,
    present: false,
    carrier: null,
    policyNumber: null,
    effective: null,
    expiry: null,
    limits: emptyLimits(),
  };
}

export function coverageByType(
  coverages: ParsedCoverage[],
  type: CoverageType,
): ParsedCoverage {
  return coverages.find((coverage) => coverage.type === type) ?? emptyCoverage(type);
}
