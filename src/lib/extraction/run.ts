import "server-only";
import { parseAcordText } from "@/lib/domain/extraction/parse";
import { extractionFromSample, sampleByFilename } from "@/lib/domain/extraction/samples";
import type { Extraction } from "@/lib/domain/types";
import { isVisionConfigured } from "@/lib/env";

const PROMPT = `You extract an ACORD 25 certificate of liability insurance.
Return JSON only with this shape:
{
  "insuredName": string | null,
  "certificateHolder": string | null,
  "producerName": string | null,
  "producerEmail": string | null,
  "additionalInsured": boolean | null,
  "waiverOfSubrogation": boolean | null,
  "description": string | null,
  "coverages": [
    {
      "type": "gl" | "wc" | "auto" | "umbrella",
      "carrier": string | null,
      "policyNumber": string | null,
      "effective": "YYYY-MM-DD" | null,
      "expiry": "YYYY-MM-DD" | null,
      "limits": {
        "eachOccurrence": number | null,
        "aggregate": number | null,
        "eachAccident": number | null,
        "diseaseEachEmployee": number | null,
        "diseasePolicy": number | null,
        "combinedSingleLimit": number | null
      }
    }
  ]
}
Use dollars as plain numbers. Include a coverage only when it is on the certificate. Do not invent policy numbers.`;

async function textFromPdf(bytes: Uint8Array): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    return text?.trim() ? text : null;
  } catch {
    return null;
  }
}

function unknownReading(filename: string): Extraction {
  const parsed = parseAcordText("", "mock");
  parsed.warnings.push(
    `No vision model is configured, and ${filename} had no readable ACORD text. Enter the fields yourself, or set EXTRACTION_API_URL to an OpenAI-compatible vision endpoint.`,
  );
  return parsed;
}

async function localExtract(bytes: Buffer, filename: string, mimeType: string): Promise<Extraction> {
  const isPdf = mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const text = await textFromPdf(new Uint8Array(bytes));
    if (text) {
      const parsed = parseAcordText(text, "text");
      if (parsed.coverages.some((coverage) => coverage.present && (coverage.policyNumber || coverage.expiry))) {
        return parsed;
      }
    }
  }
  const sample = sampleByFilename(filename);
  if (sample) {
    const parsed = extractionFromSample(sample, "mock");
    parsed.warnings.push(
      "Demo mode matched this filename to a bundled sample certificate. Confirm every field against the file.",
    );
    return parsed;
  }
  return unknownReading(filename);
}

async function visionExtract(bytes: Buffer, filename: string, mimeType: string): Promise<Extraction> {
  const base = process.env.EXTRACTION_API_URL!.replace(/\/$/, "");
  const endpoint = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
  const model = process.env.EXTRACTION_MODEL || "gpt-4o";
  const content: unknown[] = [];
  if (mimeType.startsWith("image/")) {
    content.push({ type: "text", text: PROMPT });
    content.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${bytes.toString("base64")}` },
    });
  } else {
    const text = await textFromPdf(new Uint8Array(bytes));
    content.push({
      type: "text",
      text: `${PROMPT}\n\nFile name: ${filename}\n\nCERTIFICATE TEXT:\n${text || "(no text could be extracted from this PDF)"}`,
    });
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EXTRACTION_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Extraction provider returned HTTP ${response.status}.`);
  }
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content;
  const { parseExtractionPayload } = await import("@/lib/domain/extraction/parse");
  return parseExtractionPayload(raw, "vision");
}

export async function extractCertificate(input: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
}): Promise<Extraction> {
  if (isVisionConfigured()) {
    try {
      return await visionExtract(input.bytes, input.filename, input.mimeType);
    } catch (error) {
      const fallback = await localExtract(input.bytes, input.filename, input.mimeType);
      const message = error instanceof Error ? error.message : "Vision request failed.";
      fallback.warnings.unshift(`${message} Fell back to the local reader.`);
      return fallback;
    }
  }
  return localExtract(input.bytes, input.filename, input.mimeType);
}
