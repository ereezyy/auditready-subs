import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { extractCertificate } from "@/lib/extraction/run";
import { getStore } from "@/lib/store";

const MAX_BYTES = 8 * 1024 * 1024;

function mimeFor(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const store = getStore();
  const sub = await store.getSubByToken(token);
  if (!sub) {
    return NextResponse.json({ error: "This upload link is not valid." }, { status: 404 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(new URL(`/upload/${token}?error=Choose a PDF or image.`, request.url), 303);
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.redirect(new URL(`/upload/${token}?error=Files need to be 8 MB or smaller.`, request.url), 303);
  }
  const mimeType = mimeFor(file);
  if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    return NextResponse.redirect(
      new URL(`/upload/${token}?error=Upload a PDF, PNG, or JPEG certificate.`, request.url),
      303,
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const blobId = `${sub.contractorId}/${randomUUID()}`;
  await store.putBlob(blobId, bytes, { mimeType, filename: file.name });
  let extraction = null;
  try {
    extraction = await extractCertificate({ bytes, filename: file.name || "certificate", mimeType });
  } catch (error) {
    extraction = null;
    console.error("extraction failed", error);
  }
  await store.addCertificate({
    contractorId: sub.contractorId,
    subcontractorId: sub.id,
    blobId,
    filename: file.name || "certificate",
    mimeType,
    byteSize: bytes.length,
    extraction,
  });
  return NextResponse.redirect(new URL(`/upload/${token}?uploaded=1`, request.url), 303);
}
