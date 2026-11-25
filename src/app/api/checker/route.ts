import { appNow } from "@/lib/clock";
import { assessExtraction } from "@/lib/domain/coverage";
import { todayIso } from "@/lib/domain/dates";
import { DEFAULT_REQUIREMENTS } from "@/lib/domain/requirements";
import { extractCertificate } from "@/lib/extraction/run";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose a certificate to check." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return Response.json({ error: "Files need to be 8 MB or smaller." }, { status: 400 });
  }
  const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const extraction = await extractCertificate({ bytes, filename: file.name || "certificate", mimeType });
    const flags = assessExtraction(extraction, DEFAULT_REQUIREMENTS, todayIso(appNow()));
    return Response.json({ extraction, flags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read that certificate.";
    return Response.json({ error: message }, { status: 500 });
  }
}
