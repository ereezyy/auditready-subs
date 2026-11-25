import { parseAcordText } from "@/lib/domain/extraction/parse";
import type { CoverageType, Extraction, Limits } from "@/lib/domain/types";

export type SampleCoverage = {
  type: CoverageType;
  title: string;
  carrier: string;
  policyNumber: string;
  effective: string;
  expiry: string;
  limits: { label: string; amount: number }[];
};

export type SampleCertificate = {
  key: "herrera" | "lakeside" | "pine" | "holm";
  filename: string;
  insuredName: string;
  holder: string;
  producerName: string;
  producerEmail: string;
  additionalInsured: boolean;
  waiverOfSubrogation: boolean;
  description: string;
  coverages: SampleCoverage[];
};

function money(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function usDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

export const SAMPLE_CERTIFICATES: SampleCertificate[] = [
  {
    key: "herrera",
    filename: "acord-herrera.pdf",
    insuredName: "Herrera Masonry LLC",
    holder: "Northline Builders",
    producerName: "North Shore Agency",
    producerEmail: "certs@northshore.example",
    additionalInsured: true,
    waiverOfSubrogation: true,
    description: "Certificate holder is named as additional insured on the general liability policy.",
    coverages: [
      {
        type: "gl",
        title: "COMMERCIAL GENERAL LIABILITY",
        carrier: "Harbor Mutual Insurance Co.",
        policyNumber: "CGL-100293",
        effective: "2026-01-15",
        expiry: "2027-01-15",
        limits: [
          { label: "EACH OCCURRENCE", amount: 1_000_000 },
          { label: "GENERAL AGGREGATE", amount: 2_000_000 },
        ],
      },
      {
        type: "wc",
        title: "WORKERS COMPENSATION AND EMPLOYERS LIABILITY",
        carrier: "Harbor Mutual Insurance Co.",
        policyNumber: "WC-44821",
        effective: "2026-01-15",
        expiry: "2027-01-15",
        limits: [
          { label: "EACH ACCIDENT", amount: 1_000_000 },
          { label: "DISEASE EACH EMPLOYEE", amount: 1_000_000 },
          { label: "DISEASE POLICY LIMIT", amount: 1_000_000 },
        ],
      },
      {
        type: "auto",
        title: "AUTOMOBILE LIABILITY",
        carrier: "Harbor Mutual Insurance Co.",
        policyNumber: "CA-77810",
        effective: "2026-01-15",
        expiry: "2027-01-15",
        limits: [{ label: "COMBINED SINGLE LIMIT", amount: 1_000_000 }],
      },
      {
        type: "umbrella",
        title: "UMBRELLA LIABILITY",
        carrier: "Harbor Mutual Insurance Co.",
        policyNumber: "UMB-22018",
        effective: "2026-01-15",
        expiry: "2027-01-15",
        limits: [
          { label: "EACH OCCURRENCE", amount: 2_000_000 },
          { label: "AGGREGATE", amount: 2_000_000 },
        ],
      },
    ],
  },
  {
    key: "lakeside",
    filename: "acord-lakeside.pdf",
    insuredName: "Lakeside Electric Inc",
    holder: "Northline Builders",
    producerName: "Cedar Street Insurance",
    producerEmail: "policies@cedarstreet.example",
    additionalInsured: true,
    waiverOfSubrogation: true,
    description: "Certificate holder is an additional insured on a primary and noncontributory basis.",
    coverages: [
      {
        type: "gl",
        title: "COMMERCIAL GENERAL LIABILITY",
        carrier: "Northstar Indemnity",
        policyNumber: "GL-550912",
        effective: "2026-01-15",
        expiry: "2026-12-09",
        limits: [
          { label: "EACH OCCURRENCE", amount: 1_000_000 },
          { label: "GENERAL AGGREGATE", amount: 2_000_000 },
        ],
      },
      {
        type: "wc",
        title: "WORKERS COMPENSATION AND EMPLOYERS LIABILITY",
        carrier: "Northstar Indemnity",
        policyNumber: "WC-550913",
        effective: "2026-01-15",
        expiry: "2026-12-09",
        limits: [
          { label: "EACH ACCIDENT", amount: 1_000_000 },
          { label: "DISEASE EACH EMPLOYEE", amount: 1_000_000 },
          { label: "DISEASE POLICY LIMIT", amount: 1_000_000 },
        ],
      },
    ],
  },
  {
    key: "pine",
    filename: "acord-pine.pdf",
    insuredName: "Pine & Co. Roofing",
    holder: "Northline Builders",
    producerName: "Millwright Brokers",
    producerEmail: "coi@millwright.example",
    additionalInsured: false,
    waiverOfSubrogation: false,
    description: "Roofing operations. A comp policy is not listed on this form.",
    coverages: [
      {
        type: "gl",
        title: "COMMERCIAL GENERAL LIABILITY",
        carrier: "Paper Birch Mutual",
        policyNumber: "GL-88102",
        effective: "2026-04-01",
        expiry: "2027-04-01",
        limits: [
          { label: "EACH OCCURRENCE", amount: 1_000_000 },
          { label: "GENERAL AGGREGATE", amount: 2_000_000 },
        ],
      },
    ],
  },
  {
    key: "holm",
    filename: "acord-holm.pdf",
    insuredName: "Holm Excavating LLC",
    holder: "Northline Builders",
    producerName: "Range Agency",
    producerEmail: "certs@rangeagency.example",
    additionalInsured: true,
    waiverOfSubrogation: false,
    description: "Policy term has ended. Request a renewal certificate.",
    coverages: [
      {
        type: "gl",
        title: "COMMERCIAL GENERAL LIABILITY",
        carrier: "Iron Range Casualty",
        policyNumber: "GL-19004",
        effective: "2025-10-01",
        expiry: "2026-10-01",
        limits: [
          { label: "EACH OCCURRENCE", amount: 1_000_000 },
          { label: "GENERAL AGGREGATE", amount: 2_000_000 },
        ],
      },
      {
        type: "wc",
        title: "WORKERS COMPENSATION AND EMPLOYERS LIABILITY",
        carrier: "Iron Range Casualty",
        policyNumber: "WC-19005",
        effective: "2025-10-01",
        expiry: "2026-10-01",
        limits: [
          { label: "EACH ACCIDENT", amount: 500_000 },
          { label: "DISEASE EACH EMPLOYEE", amount: 500_000 },
          { label: "DISEASE POLICY LIMIT", amount: 500_000 },
        ],
      },
    ],
  },
];

export function renderCertificateText(spec: SampleCertificate): string {
  const lines = [
    "CERTIFICATE OF LIABILITY INSURANCE",
    "ACORD 25",
    "",
    "PRODUCER",
    spec.producerName,
    `PRODUCER EMAIL: ${spec.producerEmail}`,
    "",
    "INSURED",
    spec.insuredName,
    "",
    "CERTIFICATE HOLDER",
    spec.holder,
    "",
    "COVERAGES",
  ];
  for (const coverage of spec.coverages) {
    lines.push("");
    lines.push(coverage.title);
    lines.push(`CARRIER: ${coverage.carrier}`);
    lines.push(`POLICY NUMBER: ${coverage.policyNumber}`);
    lines.push(`EFFECTIVE DATE: ${usDate(coverage.effective)}`);
    lines.push(`EXPIRATION DATE: ${usDate(coverage.expiry)}`);
    for (const limit of coverage.limits) {
      lines.push(`${limit.label}: ${money(limit.amount)}`);
    }
  }
  lines.push("");
  lines.push("DESCRIPTION OF OPERATIONS");
  lines.push(spec.description);
  lines.push(`ADDITIONAL INSURED: ${spec.additionalInsured ? "YES" : "NO"}`);
  lines.push(`WAIVER OF SUBROGATION: ${spec.waiverOfSubrogation ? "YES" : "NO"}`);
  return lines.join("\n");
}

export function sampleByFilename(filename: string): SampleCertificate | null {
  const lower = filename.toLowerCase();
  return (
    SAMPLE_CERTIFICATES.find(
      (spec) => lower.includes(spec.key) || lower.includes(spec.filename.replace(".pdf", "")),
    ) ?? null
  );
}

export function extractionFromSample(spec: SampleCertificate, source: Extraction["source"]): Extraction {
  const parsed = parseAcordText(renderCertificateText(spec), source);
  return parsed;
}

export function limitsMatch(actual: Limits, expected: { label: string; amount: number }[], type: CoverageType): boolean {
  for (const limit of expected) {
    const key = limit.label.toLowerCase();
    let value: number | null = null;
    if (key.includes("each occurrence")) value = actual.eachOccurrence;
    else if (key.includes("aggregate")) value = actual.aggregate;
    else if (key.includes("each accident")) value = actual.eachAccident;
    else if (key.includes("employee")) value = actual.diseaseEachEmployee;
    else if (key.includes("policy")) value = actual.diseasePolicy;
    else if (key.includes("combined")) value = actual.combinedSingleLimit;
    if (value !== limit.amount) return false;
  }
  if (type === "gl" && actual.eachOccurrence == null) return false;
  return true;
}
