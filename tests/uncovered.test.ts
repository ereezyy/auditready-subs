import { describe, expect, it } from "vitest";
import { gradeSub } from "@/lib/domain/coverage";
import { uncoveredDollars, type ConfirmedWindow } from "@/lib/domain/uncovered";
import { DEFAULT_REQUIREMENTS } from "@/lib/domain/requirements";
import { extractionFromSample, SAMPLE_CERTIFICATES } from "@/lib/domain/extraction/samples";
import type { ConfirmedCertificate } from "@/lib/domain/types";

const TODAY = "2026-11-25";

function confirmedFrom(key: "herrera" | "lakeside" | "pine" | "holm"): ConfirmedWindow {
  const spec = SAMPLE_CERTIFICATES.find((item) => item.key === key)!;
  const extraction = extractionFromSample(spec, "text");
  const confirmed: ConfirmedCertificate = {
    insuredName: extraction.insuredName ?? spec.insuredName,
    additionalInsured: extraction.additionalInsured ?? false,
    waiverOfSubrogation: extraction.waiverOfSubrogation ?? false,
    coverages: extraction.coverages,
    note: "",
  };
  return { subcontractorId: key, confirmed };
}

describe("uncoveredDollars", () => {
  const subs = [
    { id: "herrera", name: "Herrera Masonry LLC" },
    { id: "lakeside", name: "Lakeside Electric Inc" },
    { id: "pine", name: "Pine & Co. Roofing" },
    { id: "holm", name: "Holm Excavating LLC" },
    { id: "cedar", name: "Red Cedar Plumbing" },
  ];
  const windows = [
    confirmedFrom("herrera"),
    confirmedFrom("lakeside"),
    confirmedFrom("holm"),
  ];

  const payments = [
    { payeeName: "Herrera Masonry", amountCents: 840_000, paidOn: "2025-12-10" },
    { payeeName: "Herrera Masonry LLC", amountCents: 1_225_000, paidOn: "2026-04-02" },
    { payeeName: "Herrera Masonry LLC", amountCents: 610_000, paidOn: "2026-08-18" },
    { payeeName: "Lakeside Electric", amountCents: 1_580_000, paidOn: "2026-03-12" },
    { payeeName: "Lakeside Electric Inc", amountCents: 420_000, paidOn: "2025-11-02" },
    { payeeName: "Pine and Co Roofing", amountCents: 2_240_000, paidOn: "2026-06-15" },
    { payeeName: "Red Cedar Plumbing", amountCents: 975_000, paidOn: "2026-09-01" },
    { payeeName: "Holm Excavating", amountCents: 1_860_000, paidOn: "2026-05-20" },
    { payeeName: "Holm Excavating LLC", amountCents: 730_000, paidOn: "2026-10-15" },
    { payeeName: "Unknown Vendor", amountCents: 50_000, paidOn: "2026-07-01" },
  ];

  const report = uncoveredDollars(payments, subs, windows);

  it("covers a payment only when both WC and GL are in force that day", () => {
    const april = report.lines.find((line) => line.paidOn === "2026-04-02");
    expect(april?.uncovered).toBe(false);
    expect(april?.wcInForce).toBe(true);
    expect(april?.glInForce).toBe(true);

    const before = report.lines.find((line) => line.paidOn === "2025-12-10");
    expect(before?.uncovered).toBe(true);
    expect(before?.reason).toMatch(/No workers' comp or general liability/);

    const afterExpiry = report.lines.find((line) => line.paidOn === "2026-10-15");
    expect(afterExpiry?.uncovered).toBe(true);
    expect(afterExpiry?.subcontractorId).toBe("holm");
  });

  it("ignores a sub with no confirmed certificate and unmatched payees", () => {
    const pine = report.lines.find((line) => line.payeeName.startsWith("Pine"));
    expect(pine?.subcontractorId).toBe("pine");
    expect(pine?.uncovered).toBe(true);
    const cedar = report.lines.find((line) => line.matchedName === "Red Cedar Plumbing");
    expect(cedar?.uncovered).toBe(true);
    const unknown = report.lines.find((line) => line.payeeName === "Unknown Vendor");
    expect(unknown?.subcontractorId).toBeNull();
    expect(unknown?.uncovered).toBe(true);
  });

  it("sums uncovered dollars and the workers' comp payroll add-back", () => {
    expect(report.uncoveredCents).toBe(840_000 + 420_000 + 2_240_000 + 975_000 + 730_000 + 50_000);
    expect(report.coveredCents).toBe(1_225_000 + 610_000 + 1_580_000 + 1_860_000);
    expect(report.totalPaidCents).toBe(report.uncoveredCents + report.coveredCents);
    expect(report.uncoveredWcCents).toBe(report.uncoveredCents);
  });

  it("does not treat GL-only coverage as valid for the audit total", () => {
    const pineWindow = confirmedFrom("pine");
    const only = uncoveredDollars(
      [{ payeeName: "Pine & Co. Roofing", amountCents: 100_00, paidOn: "2026-06-15" }],
      subs,
      [pineWindow],
    );
    expect(only.lines[0].glInForce).toBe(true);
    expect(only.lines[0].wcInForce).toBe(false);
    expect(only.lines[0].uncovered).toBe(true);
    expect(only.uncoveredWcCents).toBe(100_00);
    expect(only.lines[0].reason).toMatch(/auditor/);
  });

  it("uses an older confirmed certificate when the payment falls inside it", () => {
    const first = confirmedFrom("herrera");
    const reportWithHistory = uncoveredDollars(
      [{ payeeName: "Herrera Masonry LLC", amountCents: 500, paidOn: "2026-06-01" }],
      subs,
      [first],
    );
    expect(reportWithHistory.lines[0].uncovered).toBe(false);
  });
});

describe("gradeSub", () => {
  function cert(key: "herrera" | "lakeside" | "pine" | "holm", status: "confirmed" | "pending_review") {
    const window = confirmedFrom(key);
    return {
      status,
      uploadedAt: "2026-02-01T00:00:00.000Z",
      confirmedAt: status === "confirmed" ? "2026-02-02T00:00:00.000Z" : null,
      confirmed: status === "confirmed" ? window.confirmed : null,
    };
  }

  it("marks a current full certificate green", () => {
    const grade = gradeSub({
      certificates: [cert("herrera", "confirmed")],
      requirements: DEFAULT_REQUIREMENTS,
      today: TODAY,
    });
    expect(grade.level).toBe("green");
    expect(grade.label).toBe("Covered");
  });

  it("marks a certificate inside the warning window amber", () => {
    const grade = gradeSub({
      certificates: [cert("lakeside", "confirmed")],
      requirements: DEFAULT_REQUIREMENTS,
      today: TODAY,
    });
    expect(grade.level).toBe("amber");
    expect(grade.label).toBe("Expiring");
    expect(grade.daysToExpiry).toBe(14);
  });

  it("marks missing workers' comp and an expired certificate red", () => {
    const pending = gradeSub({
      certificates: [cert("pine", "pending_review")],
      requirements: DEFAULT_REQUIREMENTS,
      today: TODAY,
    });
    expect(pending.label).toBe("Review");

    const expired = gradeSub({
      certificates: [cert("holm", "confirmed")],
      requirements: DEFAULT_REQUIREMENTS,
      today: TODAY,
    });
    expect(expired.level).toBe("red");
    expect(expired.label).toBe("Gap");
    expect(expired.reasons.some((reason) => /expired/i.test(reason.text))).toBe(true);
  });

  it("is red when there is no certificate", () => {
    const grade = gradeSub({
      certificates: [],
      requirements: DEFAULT_REQUIREMENTS,
      today: TODAY,
    });
    expect(grade.level).toBe("red");
    expect(grade.reasons[0].text).toMatch(/No certificate/);
  });
});
