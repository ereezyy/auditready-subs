import { requireContractor } from "@/lib/auth/current";
import { getStore } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const contractor = await requireContractor();
  const { id } = await context.params;
  const certificate = await getStore().getCertificate(contractor.id, id);
  if (!certificate) return new Response("Not found", { status: 404 });
  const blob = await getStore().getBlob(certificate.blobId);
  if (!blob) return new Response("File missing", { status: 404 });
  return new Response(new Uint8Array(blob.bytes), {
    headers: {
      "Content-Type": certificate.mimeType || blob.mimeType,
      "Content-Disposition": `inline; filename="${certificate.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
