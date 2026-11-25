import { readFile } from "node:fs/promises";
import path from "node:path";

const FILES: Record<string, string> = {
  "subs.csv": "text/csv; charset=utf-8",
  "payments.csv": "text/csv; charset=utf-8",
  "acord-herrera.pdf": "application/pdf",
  "acord-lakeside.pdf": "application/pdf",
  "acord-pine.pdf": "application/pdf",
  "acord-holm.pdf": "application/pdf",
  "acord-herrera.png": "image/png",
};

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const type = FILES[name];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), "samples", name));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch {
    return new Response("Sample has not been generated yet.", { status: 404 });
  }
}
