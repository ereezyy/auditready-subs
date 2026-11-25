import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { parseAcordText, parseExtractionPayload } from "@/lib/domain/extraction/parse";
import {
  SAMPLE_CERTIFICATES,
  extractionFromSample,
  renderCertificateText,
} from "@/lib/domain/extraction/samples";
import { coverageByType } from "@/lib/domain/types";

describe("parseExtractionPayload", () => {
  it("normalizes aliases, money, and dates from a vision payload", () => {
    const extraction = parseExtractionPayload({
      insured: "Herrera Masonry LLC",
      certificate_holder: "Northline Builders",
      producer: "North Shore Agency",
      producerEmail: "certs@northshore.example",
      additional_insured: "Y",
      waiver: "checked",
      coverages: [
        {
          coverage: "Commercial General Liability",
          insurer: "Harbor Mutual Insurance Co.",
          policy_number: "CGL-100293",
          effectiveDate: "01/15/2026",
          expiration: "January 15, 2027",
          limits: {
            each_occurrence: "$1,000,000",
            generalAggregate: "2000000",
          },
        },
        {
          type: "Workers Compensation",
          carrier: "Harbor Mutual Insurance Co.",
          policy: "WC-44821",
          effective: "2026-01-15",
          expiry: "01/15/2027",
          eachAccident: 1000000,
        },
      ],
    });

    expect(extraction.insuredName).toBe("Herrera Masonry LLC");
    expect(extraction.additionalInsured).toBe(true);
    expect(extraction.waiverOfSubrogation).toBe(true);
    const gl = coverageByType(extraction.coverages, "gl");
    expect(gl.present).toBe(true);
    expect(gl.policyNumber).toBe("CGL-100293");
    expect(gl.effective).toBe("2026-01-15");
    expect(gl.expiry).toBe("2027-01-15");
    expect(gl.limits.eachOccurrence).toBe(1_000_000);
    expect(gl.limits.aggregate).toBe(2_000_000);
    const wc = coverageByType(extraction.coverages, "wc");
    expect(wc.policyNumber).toBe("WC-44821");
    expect(wc.limits.eachAccident).toBe(1_000_000);
    expect(coverageByType(extraction.coverages, "auto").present).toBe(false);
  });

  it("strips a markdown fence and rejects garbage", () => {
    const extraction = parseExtractionPayload(
      '```json\n{"insuredName":"Pine Roofing","additionalInsured":false,"coverages":[]}\n```',
    );
    expect(extraction.insuredName).toBe("Pine Roofing");
    expect(extraction.additionalInsured).toBe(false);
    expect(() => parseExtractionPayload("not json")).toThrow(/JSON/);
    expect(() => parseExtractionPayload("[]")).toThrow(/object/);
  });

  it("treats an explicit present:false coverage as absent", () => {
    const extraction = parseExtractionPayload({
      coverages: [{ type: "gl", present: false, policyNumber: "SHOULD-IGNORE" }],
    });
    expect(coverageByType(extraction.coverages, "gl").present).toBe(false);
  });
});

describe("parseAcordText", () => {
  it("round-trips every bundled sample certificate", () => {
    for (const spec of SAMPLE_CERTIFICATES) {
      const extraction = extractionFromSample(spec, "text");
      expect(extraction.insuredName).toBe(spec.insuredName);
      expect(extraction.certificateHolder).toBe(spec.holder);
      expect(extraction.producerName).toBe(spec.producerName);
      expect(extraction.producerEmail).toBe(spec.producerEmail);
      expect(extraction.additionalInsured).toBe(spec.additionalInsured);
      expect(extraction.waiverOfSubrogation).toBe(spec.waiverOfSubrogation);
      for (const coverage of spec.coverages) {
        const parsed = coverageByType(extraction.coverages, coverage.type);
        expect(parsed.present, coverage.policyNumber).toBe(true);
        expect(parsed.policyNumber).toBe(coverage.policyNumber);
        expect(parsed.carrier).toBe(coverage.carrier);
        expect(parsed.effective).toBe(coverage.effective);
        expect(parsed.expiry).toBe(coverage.expiry);
        for (const limit of coverage.limits) {
          const key = limit.label.toLowerCase();
          const actual = key.includes("each occurrence")
            ? parsed.limits.eachOccurrence
            : key.includes("aggregate")
              ? parsed.limits.aggregate
              : key.includes("each accident")
                ? parsed.limits.eachAccident
                : key.includes("employee")
                  ? parsed.limits.diseaseEachEmployee
                  : key.includes("policy")
                    ? parsed.limits.diseasePolicy
                    : parsed.limits.combinedSingleLimit;
          expect(actual, `${spec.key} ${limit.label}`).toBe(limit.amount);
        }
      }
      const absent = ["gl", "wc", "auto", "umbrella"] as const;
      for (const type of absent) {
        if (spec.coverages.some((coverage) => coverage.type === type)) continue;
        expect(coverageByType(extraction.coverages, type).present).toBe(false);
      }
    }
  });

  it("does not invent workers' comp from a sentence in the description", () => {
    const text = `${renderCertificateText(SAMPLE_CERTIFICATES[2])}\nWorkers compensation was mentioned only as a note.`;
    const extraction = parseAcordText(text);
    expect(coverageByType(extraction.coverages, "wc").present).toBe(false);
    expect(coverageByType(extraction.coverages, "gl").policyNumber).toBe("GL-88102");
  });

  it("reads the bundled Herrera PDF back into policy numbers", async () => {
    const bytes = new Uint8Array(await readFile("samples/acord-herrera.pdf"));
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    const extraction = parseAcordText(text);
    expect(extraction.insuredName).toBe("Herrera Masonry LLC");
    expect(coverageByType(extraction.coverages, "gl").policyNumber).toBe("CGL-100293");
    expect(coverageByType(extraction.coverages, "wc").limits.diseasePolicy).toBe(1_000_000);
    expect(extraction.additionalInsured).toBe(true);
  });

  it("returns an empty reading for blank text", () => {
    const extraction = parseAcordText("   ");
    expect(extraction.insuredName).toBeNull();
    expect(extraction.coverages.every((coverage) => !coverage.present)).toBe(true);
    expect(extraction.confidence).toBeLessThan(0.4);
  });
});
