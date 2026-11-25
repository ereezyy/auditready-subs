"use client";

import { useState, type FormEvent } from "react";
import { COVERAGE_LABEL, coverageByType } from "@/lib/domain/types";
import type { Extraction, Flag } from "@/lib/domain/types";
import { formatIsoDate } from "@/lib/domain/dates";
import { formatLimit } from "@/lib/domain/money";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Result = { extraction: Extraction; flags: Flag[] };

export function Checker() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [email, setEmail] = useState("");
  const [lead, setLead] = useState<"idle" | "saving" | "sent" | "error">("idle");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a certificate.");
      return;
    }
    setPending(true);
    setError(null);
    setLead("idle");
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/checker", { method: "POST", body });
    const json = (await response.json()) as Result & { error?: string };
    setPending(false);
    if (!response.ok) {
      setResult(null);
      setError(json.error || "Could not read that file.");
      return;
    }
    setResult(json);
  }

  async function saveLead(event: FormEvent) {
    event.preventDefault();
    setLead("saving");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        summary: result
          ? {
              insuredName: result.extraction.insuredName,
              flags: result.flags,
              expiry: coverageByType(result.extraction.coverages, "gl").expiry,
            }
          : null,
      }),
    });
    setLead(response.ok ? "sent" : "error");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="sheet space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="file">ACORD 25 (PDF or image)</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <Button type="submit" variant="copper" disabled={pending}>
          {pending ? "Reading…" : "Read certificate"}
        </Button>
        <p className="text-xs leading-5 text-ink-soft">
          The file is read in this request and is not saved. Without a vision key, PDFs are parsed from their
          text and the bundled sample images are recognized by filename.
        </p>
      </form>

      {result ? (
        <section className="sheet p-5">
          <h2 className="display text-3xl">{result.extraction.insuredName || "Insured name not read"}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {result.extraction.producerName || "Producer not read"}
            {result.extraction.producerEmail ? ` · ${result.extraction.producerEmail}` : ""} · confidence{" "}
            {Math.round(result.extraction.confidence * 100)}%
          </p>
          {result.extraction.warnings.map((warning) => (
            <p key={warning} className="mt-3 text-sm text-amber">{warning}</p>
          ))}
          <ul className="mt-4 space-y-2">
            {result.flags.map((flag) => (
              <li
                key={flag.text}
                className={
                  flag.level === "red" ? "text-signal" : flag.level === "amber" ? "text-amber" : "text-ink-soft"
                }
              >
                {flag.level === "red" ? "Gap" : flag.level === "amber" ? "Check" : "Note"} — {flag.text}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {result.extraction.coverages.filter((coverage) => coverage.present).map((coverage) => (
              <article key={coverage.type} className="rounded-xl border border-line p-3 text-sm">
                <h3 className="font-semibold">{COVERAGE_LABEL[coverage.type]}</h3>
                <p>{coverage.carrier || "Carrier not read"}</p>
                <p>Policy {coverage.policyNumber || "—"}</p>
                <p>
                  {formatIsoDate(coverage.effective)} – {formatIsoDate(coverage.expiry)}
                </p>
                <p>
                  {coverage.limits.eachOccurrence ? `${formatLimit(coverage.limits.eachOccurrence)} occ` : null}{" "}
                  {coverage.limits.aggregate ? `${formatLimit(coverage.limits.aggregate)} agg` : null}{" "}
                  {coverage.limits.eachAccident ? `${formatLimit(coverage.limits.eachAccident)} accident` : null}{" "}
                  {coverage.limits.combinedSingleLimit ? `${formatLimit(coverage.limits.combinedSingleLimit)} CSL` : null}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm">
            Additional insured: {result.extraction.additionalInsured == null ? "not read" : result.extraction.additionalInsured ? "yes" : "no"}
            {" · "}
            Waiver: {result.extraction.waiverOfSubrogation == null ? "not read" : result.extraction.waiverOfSubrogation ? "yes" : "no"}
          </p>

          <form onSubmit={saveLead} className="mt-6 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="lead-email">Email me this readout</Label>
              <Input id="lead-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <Button type="submit" className="self-end" disabled={lead === "saving" || lead === "sent"}>
              {lead === "sent" ? "Saved" : lead === "saving" ? "Saving…" : "Send it"}
            </Button>
          </form>
          {lead === "sent" ? <p className="form-ok mt-3">Saved. In this demo the note stays in the local lead list and the server log.</p> : null}
          {lead === "error" ? <p className="form-error mt-3">That email did not save. Try again.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
