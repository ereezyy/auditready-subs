import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { renderPageAsImage } from "unpdf";
import { renderCertificateText, SAMPLE_CERTIFICATES } from "../src/lib/domain/extraction/samples";
import { DEMO_PAYMENTS, DEMO_SUBS } from "../src/lib/seed";

const root = path.join(process.cwd(), "samples");

function usDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

async function certificatePdf(spec: (typeof SAMPLE_CERTIFICATES)[number]) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({
    x: 28,
    y: 28,
    width: 556,
    height: 736,
    borderColor: rgb(0.1, 0.14, 0.2),
    borderWidth: 1.2,
  });
  page.drawRectangle({
    x: 28,
    y: 724,
    width: 556,
    height: 40,
    color: rgb(0.1, 0.14, 0.2),
  });
  page.drawText("ACORD 25  ·  CERTIFICATE OF LIABILITY INSURANCE", {
    x: 40,
    y: 738,
    size: 11,
    font: bold,
    color: rgb(0.96, 0.94, 0.89),
  });

  let y = 700;
  for (const line of renderCertificateText(spec).split("\n")) {
    if (!line) {
      y -= 8;
      continue;
    }
    const heading = line === line.toUpperCase() && !line.includes(":") && !line.startsWith("ACORD");
    page.drawText(line, {
      x: 44,
      y,
      size: heading ? 10 : 9,
      font: heading ? bold : font,
      color: rgb(0.1, 0.14, 0.2),
    });
    y -= heading ? 16 : 13;
  }
  return Buffer.from(await pdf.save());
}

async function main() {
  await mkdir(root, { recursive: true });
  const subsHeader = "Vendor,Email,Phone,Trade,Agent Name,Agent Email";
  const subsRows = DEMO_SUBS.map(
    (sub) =>
      [sub.name, sub.email, sub.phone, sub.trade, sub.agentName, sub.agentEmail]
        .map((value) => `"${value.replace(/"/g, '""')}"`)
        .join(","),
  );
  await writeFile(path.join(root, "subs.csv"), [subsHeader, ...subsRows].join("\n") + "\n");

  const payHeader = "Vendor,Payment Date,Amount,Memo";
  const payRows = DEMO_PAYMENTS.map((payment) =>
    [
      `"${payment.payeeName}"`,
      usDate(payment.paidOn),
      (payment.amountCents / 100).toFixed(2),
      `"${payment.memo}"`,
    ].join(","),
  );
  await writeFile(path.join(root, "payments.csv"), [payHeader, ...payRows].join("\n") + "\n");

  let herrera: Buffer | null = null;
  for (const spec of SAMPLE_CERTIFICATES) {
    const bytes = await certificatePdf(spec);
    await writeFile(path.join(root, spec.filename), bytes);
    if (spec.key === "herrera") herrera = bytes;
  }
  if (!herrera) throw new Error("Missing Herrera sample.");
  const png = await renderPageAsImage(new Uint8Array(herrera), 1, {
    canvasImport: () => import("@napi-rs/canvas"),
    scale: 2,
  });
  await writeFile(path.join(root, "acord-herrera.png"), Buffer.from(png));
  console.log("Wrote samples to", root);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
