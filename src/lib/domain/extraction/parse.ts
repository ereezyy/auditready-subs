import { parseDate } from "@/lib/domain/dates";
import { parseMoneyToCents } from "@/lib/domain/money";
import {
  COVERAGE_TYPES,
  type CoverageType,
  type Extraction,
  type Limits,
  type ParsedCoverage,
  emptyCoverage,
  emptyLimits,
} from "@/lib/domain/types";

const TYPE_PATTERNS: { type: CoverageType; re: RegExp }[] = [
  { type: "gl", re: /commercial general liability|\bgeneral liability\b|\bcgl\b/i },
  { type: "wc", re: /workers?'?\s*compensation|employers?'?\s*liability/i },
  { type: "auto", re: /automobile liability|\bauto liability\b|business auto/i },
  { type: "umbrella", re: /umbrella liability|excess liability|\bumbrella\b/i },
];

function dollars(value: unknown): number | null {
  const cents = parseMoneyToCents(value as string | number | null);
  if (cents == null) return null;
  return Math.round(cents / 100);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function boolish(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (["yes", "y", "true", "checked", "x", "1"].includes(v)) return true;
  if (["no", "n", "false", "unchecked", "0"].includes(v)) return false;
  return null;
}

function coverageType(value: unknown): CoverageType | null {
  const raw = text(value)?.toLowerCase() ?? "";
  if (!raw) return null;
  if (/umbrella|excess/.test(raw)) return "umbrella";
  if (/worker|employers|work comp|\bwc\b/.test(raw)) return "wc";
  if (/auto|automobile/.test(raw)) return "auto";
  if (/general|liability|\bcgl\b|\bgl\b/.test(raw)) return "gl";
  return null;
}

function limitsFrom(value: unknown): Limits {
  const limits = emptyLimits();
  if (!value || typeof value !== "object") return limits;
  const raw = value as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      if (raw[key] != null && raw[key] !== "") return dollars(raw[key]);
    }
    return null;
  };
  limits.eachOccurrence = pick(
    "eachOccurrence",
    "each_occurrence",
    "occurrence",
    "perOccurrence",
  );
  limits.aggregate = pick("aggregate", "generalAggregate", "general_aggregate");
  limits.eachAccident = pick("eachAccident", "each_accident", "accident");
  limits.diseaseEachEmployee = pick(
    "diseaseEachEmployee",
    "disease_each_employee",
    "diseaseEmployee",
  );
  limits.diseasePolicy = pick("diseasePolicy", "disease_policy", "diseasePolicyLimit");
  limits.combinedSingleLimit = pick(
    "combinedSingleLimit",
    "combined_single_limit",
    "csl",
  );
  return limits;
}

function applyLimitLabel(limits: Limits, label: string, amount: number | null) {
  const key = label.toLowerCase();
  if (amount == null) return;
  if (/each occurrence|per occurrence/.test(key)) limits.eachOccurrence = amount;
  else if (/general aggregate|^aggregate$|aggregate limit/.test(key)) limits.aggregate = amount;
  else if (/each accident/.test(key)) limits.eachAccident = amount;
  else if (/disease.*employee|ea employee/.test(key)) limits.diseaseEachEmployee = amount;
  else if (/disease.*policy/.test(key)) limits.diseasePolicy = amount;
  else if (/combined single/.test(key)) limits.combinedSingleLimit = amount;
}

function unwrapJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("The extraction model did not return JSON.");
  }
}

function confidenceFor(extraction: Omit<Extraction, "confidence">): number {
  let score = 0.15;
  if (extraction.insuredName) score += 0.2;
  const rich = extraction.coverages.filter(
    (coverage) => coverage.present && coverage.policyNumber && coverage.expiry,
  );
  score += Math.min(0.5, rich.length * 0.15);
  if (extraction.additionalInsured != null) score += 0.1;
  return Math.round(Math.min(1, score) * 100) / 100;
}

function withAllTypes(found: ParsedCoverage[]): ParsedCoverage[] {
  return COVERAGE_TYPES.map((type) => found.find((coverage) => coverage.type === type) ?? emptyCoverage(type));
}

export function parseExtractionPayload(raw: unknown, source: Extraction["source"] = "vision"): Extraction {
  const json = unwrapJson(raw);
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("Extraction JSON must be an object.");
  }
  const record = json as Record<string, unknown>;
  const found: ParsedCoverage[] = [];
  const list = Array.isArray(record.coverages) ? record.coverages : [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = coverageType(row.type ?? row.coverage ?? row.line);
    if (!type) continue;
    const present = row.present === false ? false : true;
    found.push({
      type,
      present,
      carrier: text(row.carrier ?? row.insurer ?? row.company),
      policyNumber: text(row.policyNumber ?? row.policy_number ?? row.policy),
      effective: parseDate(text(row.effective ?? row.effectiveDate ?? row.effective_date)),
      expiry: parseDate(text(row.expiry ?? row.expiration ?? row.expirationDate ?? row.expiryDate)),
      limits: limitsFrom(row.limits ?? row),
    });
  }

  const extraction: Omit<Extraction, "confidence"> = {
    insuredName: text(record.insuredName ?? record.insured ?? record.namedInsured),
    certificateHolder: text(record.certificateHolder ?? record.holder ?? record.certificate_holder),
    producerName: text(record.producerName ?? record.producer ?? record.agentName ?? record.agency),
    producerEmail: text(record.producerEmail ?? record.agentEmail ?? record.email),
    additionalInsured: boolish(record.additionalInsured ?? record.additional_insured),
    waiverOfSubrogation: boolish(record.waiverOfSubrogation ?? record.waiver_of_subrogation ?? record.waiver),
    description: text(record.description ?? record.descriptionOfOperations),
    coverages: withAllTypes(found),
    source,
    warnings: Array.isArray(record.warnings)
      ? record.warnings.filter((item): item is string => typeof item === "string")
      : [],
  };
  return { ...extraction, confidence: confidenceFor(extraction) };
}

function field(block: string, labels: string[]): string | null {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:|]\\s*([^\\n]+)`, "i");
    const match = block.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function sectionLine(text: string, label: string): string | null {
  const sameLine = text.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, "i"));
  if (sameLine?.[1]?.trim()) return sameLine[1].trim();
  const nextLine = text.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*\\n\\s*([^\\n]+)`, "i"));
  if (nextLine?.[1]?.trim() && !/^[A-Z ]{6,}:?$/.test(nextLine[1].trim())) {
    return nextLine[1].trim();
  }
  return null;
}

function yesNo(text: string, label: string): boolean | null {
  const match = text.match(
    new RegExp(`${label}\\s*[:]?\\s*(yes|no|y|n|true|false|checked|unchecked|x)`, "i"),
  );
  if (!match) return null;
  return boolish(match[1]);
}

export function parseAcordText(input: string, source: Extraction["source"] = "text"): Extraction {
  const text = input.replace(/\r/g, "\n");
  const hits: { type: CoverageType; index: number }[] = [];
  for (const marker of TYPE_PATTERNS) {
    const flags = new RegExp(marker.re.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = flags.exec(text))) {
      const overlapping = hits.some(
        (hit) => Math.abs(hit.index - match!.index) < 8,
      );
      if (!overlapping) hits.push({ type: marker.type, index: match.index });
    }
  }
  hits.sort((a, b) => a.index - b.index);
  const unique: { type: CoverageType; index: number }[] = [];
  for (const hit of hits) {
    if (unique.some((item) => item.type === hit.type)) continue;
    const lineStart = text.lastIndexOf("\n", hit.index - 1) + 1;
    const lineEnd = text.indexOf("\n", hit.index);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();
    const nearby = text.slice(hit.index, hit.index + 500);
    const header =
      line.length <= 80 &&
      /policy number|carrier:|each occurrence|each accident|combined single/i.test(nearby);
    if (!header) continue;
    unique.push(hit);
  }

  const found: ParsedCoverage[] = unique.map((hit, position) => {
    const end = unique[position + 1]?.index ?? text.length;
    const block = text.slice(hit.index, end);
    const limits = emptyLimits();
    const limitPattern =
      /(each occurrence|general aggregate|aggregate|each accident|disease[^\n:]{0,40}employee[^\n:]{0,20}|disease[^\n:]{0,40}policy[^\n:]{0,20}|combined single limit)\s*[:|]?\s*(\$[\d,]+|\d[\d,]*)/gi;
    let limitMatch: RegExpExecArray | null;
    while ((limitMatch = limitPattern.exec(block))) {
      applyLimitLabel(limits, limitMatch[1], dollars(limitMatch[2]));
    }
    const present = true;
    return {
      type: hit.type,
      present,
      carrier: field(block, ["carrier", "insurer", "company"]),
      policyNumber: field(block, ["policy number", "policy no", "policy #"]),
      effective: parseDate(field(block, ["effective date", "effective"])),
      expiry: parseDate(field(block, ["expiration date", "expiry date", "expiration", "expires"])),
      limits,
    };
  });

  const emailMatch = text.match(
    /(?:producer email|agent email|email)\s*[:|]?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  );
  const fallbackEmail = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  const extraction: Omit<Extraction, "confidence"> = {
    insuredName: sectionLine(text, "INSURED"),
    certificateHolder: sectionLine(text, "CERTIFICATE HOLDER"),
    producerName: sectionLine(text, "PRODUCER"),
    producerEmail: emailMatch?.[1] ?? fallbackEmail?.[0] ?? null,
    additionalInsured: yesNo(text, "additional insured"),
    waiverOfSubrogation: yesNo(text, "waiver of subrogation"),
    description: sectionLine(text, "DESCRIPTION OF OPERATIONS"),
    coverages: withAllTypes(found),
    source,
    warnings: [],
  };
  return { ...extraction, confidence: confidenceFor(extraction) };
}
