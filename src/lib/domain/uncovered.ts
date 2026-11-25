import { namesMatch, normalizeName } from "@/lib/domain/names";
import { lineInForce } from "@/lib/domain/coverage";
import type { ConfirmedCertificate, ParsedCoverage } from "@/lib/domain/types";
import { coverageByType } from "@/lib/domain/types";

export type PaymentInput = {
  id?: string;
  payeeName: string;
  amountCents: number;
  paidOn: string;
};

export type SubInput = {
  id: string;
  name: string;
};

export type ConfirmedWindow = {
  subcontractorId: string;
  confirmed: ConfirmedCertificate;
};

export type UncoveredLine = {
  payeeName: string;
  subcontractorId: string | null;
  matchedName: string | null;
  paidOn: string;
  amountCents: number;
  wcInForce: boolean;
  glInForce: boolean;
  uncovered: boolean;
  reason: string;
};

export type UncoveredSubtotal = {
  key: string;
  name: string;
  subcontractorId: string | null;
  totalCents: number;
  uncoveredCents: number;
  coveredCents: number;
  uncoveredWcCents: number;
};

export type UncoveredReport = {
  lines: UncoveredLine[];
  bySub: UncoveredSubtotal[];
  totalPaidCents: number;
  uncoveredCents: number;
  coveredCents: number;
  uncoveredWcCents: number;
};

function matchSub(payee: string, subs: SubInput[]): SubInput | null {
  const exact = subs.find((sub) => normalizeName(payee) === normalizeName(sub.name));
  if (exact) return exact;
  const matches = subs.filter((sub) => namesMatch(payee, sub.name));
  if (matches.length === 1) return matches[0];
  return null;
}

function covered(coverages: ParsedCoverage[][], type: "gl" | "wc", day: string): boolean {
  return coverages.some((set) => lineInForce(coverageByType(set, type), day));
}

/**
 * Dollars paid on dates with no valid workers' comp and general liability.
 * A date is covered only when a confirmed certificate has both WC and GL in force.
 * Pending certificates do not count. The WC-only total is what an auditor adds to payroll.
 */
export function uncoveredDollars(
  payments: PaymentInput[],
  subs: SubInput[],
  windows: ConfirmedWindow[],
): UncoveredReport {
  const bySubId = new Map<string, ConfirmedCertificate[]>();
  for (const window of windows) {
    const list = bySubId.get(window.subcontractorId) ?? [];
    list.push(window.confirmed);
    bySubId.set(window.subcontractorId, list);
  }

  const lines: UncoveredLine[] = payments.map((payment) => {
    const sub = matchSub(payment.payeeName, subs);
    if (!sub) {
      return {
        payeeName: payment.payeeName,
        subcontractorId: null,
        matchedName: null,
        paidOn: payment.paidOn,
        amountCents: payment.amountCents,
        wcInForce: false,
        glInForce: false,
        uncovered: true,
        reason: "No matching subcontractor on file.",
      };
    }
    const sets = (bySubId.get(sub.id) ?? []).map((certificate) => certificate.coverages);
    const wcInForce = covered(sets, "wc", payment.paidOn);
    const glInForce = covered(sets, "gl", payment.paidOn);
    const uncovered = !(wcInForce && glInForce);
    let reason = "WC and GL were both in force.";
    if (!wcInForce && !glInForce) reason = "No workers' comp or general liability in force.";
    else if (!wcInForce) reason = "No workers' comp in force. An auditor can add this to payroll.";
    else if (!glInForce) reason = "No general liability in force.";
    return {
      payeeName: payment.payeeName,
      subcontractorId: sub.id,
      matchedName: sub.name,
      paidOn: payment.paidOn,
      amountCents: payment.amountCents,
      wcInForce,
      glInForce,
      uncovered,
      reason,
    };
  });

  const groups = new Map<string, UncoveredSubtotal>();
  for (const line of lines) {
    const key = line.subcontractorId ?? `unmatched:${line.payeeName.toLowerCase()}`;
    const current = groups.get(key) ?? {
      key,
      name: line.matchedName ?? line.payeeName,
      subcontractorId: line.subcontractorId,
      totalCents: 0,
      uncoveredCents: 0,
      coveredCents: 0,
      uncoveredWcCents: 0,
    };
    current.totalCents += line.amountCents;
    if (line.uncovered) current.uncoveredCents += line.amountCents;
    else current.coveredCents += line.amountCents;
    if (!line.wcInForce) current.uncoveredWcCents += line.amountCents;
    groups.set(key, current);
  }

  const bySub = [...groups.values()].sort((a, b) => b.uncoveredCents - a.uncoveredCents);
  const totalPaidCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const uncoveredCents = lines.reduce((sum, line) => sum + (line.uncovered ? line.amountCents : 0), 0);
  const uncoveredWcCents = lines.reduce(
    (sum, line) => sum + (line.wcInForce ? 0 : line.amountCents),
    0,
  );

  return {
    lines,
    bySub,
    totalPaidCents,
    uncoveredCents,
    coveredCents: totalPaidCents - uncoveredCents,
    uncoveredWcCents,
  };
}
