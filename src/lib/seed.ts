import { randomUUID } from "node:crypto";
import { extractionFromSample, SAMPLE_CERTIFICATES } from "@/lib/domain/extraction/samples";
import { DEFAULT_REQUIREMENTS } from "@/lib/domain/requirements";
import type { ConfirmedCertificate } from "@/lib/domain/types";
import type { CertificateRecord, Database, PaymentRecord, SubcontractorRecord } from "@/lib/store/types";
import { appNow } from "@/lib/clock";

export const DEMO_EMAIL = "demo@northline.example";
export const DEMO_PASSWORD = "northline-demo";
export const DEMO_CONTRACTOR_ID = "11111111-1111-4111-8111-111111111111";

export const DEMO_SUBS: Omit<SubcontractorRecord, "contractorId" | "createdAt">[] = [
  {
    id: "22222222-2222-4222-8222-222222222221",
    name: "Herrera Masonry LLC",
    email: "office@herreramasonry.example",
    phone: "612-555-0142",
    trade: "Masonry",
    agentName: "North Shore Agency",
    agentEmail: "certs@northshore.example",
    uploadToken: "demo-upload-herrera",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Lakeside Electric Inc",
    email: "ap@lakesideelectric.example",
    phone: "612-555-0177",
    trade: "Electrical",
    agentName: "Cedar Street Insurance",
    agentEmail: "policies@cedarstreet.example",
    uploadToken: "demo-upload-lakeside",
  },
  {
    id: "22222222-2222-4222-8222-222222222223",
    name: "Pine & Co. Roofing",
    email: "jobs@pineco.example",
    phone: "651-555-0194",
    trade: "Roofing",
    agentName: "Millwright Brokers",
    agentEmail: "coi@millwright.example",
    uploadToken: "demo-upload-pine",
  },
  {
    id: "22222222-2222-4222-8222-222222222224",
    name: "Red Cedar Plumbing",
    email: "office@redcedar.example",
    phone: "763-555-0118",
    trade: "Plumbing",
    agentName: "",
    agentEmail: "",
    uploadToken: "demo-upload-cedar",
  },
  {
    id: "22222222-2222-4222-8222-222222222225",
    name: "Holm Excavating LLC",
    email: "billing@holmexcavating.example",
    phone: "218-555-0160",
    trade: "Excavation",
    agentName: "Range Agency",
    agentEmail: "certs@rangeagency.example",
    uploadToken: "demo-upload-holm",
  },
];

export const DEMO_PAYMENTS: Omit<PaymentRecord, "id" | "contractorId" | "importedAt">[] = [
  { payeeName: "Herrera Masonry LLC", amountCents: 840_000, paidOn: "2025-12-10", memo: "Foundation block" },
  { payeeName: "Herrera Masonry LLC", amountCents: 1_225_000, paidOn: "2026-04-02", memo: "Brick veneer, building B" },
  { payeeName: "Herrera Masonry LLC", amountCents: 610_000, paidOn: "2026-08-18", memo: "Retaining wall" },
  { payeeName: "Lakeside Electric Inc", amountCents: 1_580_000, paidOn: "2026-03-12", memo: "Rough-in" },
  { payeeName: "Lakeside Electric Inc", amountCents: 420_000, paidOn: "2025-11-02", memo: "Temporary power" },
  { payeeName: "Pine & Co. Roofing", amountCents: 2_240_000, paidOn: "2026-06-15", memo: "Shingle package" },
  { payeeName: "Red Cedar Plumbing", amountCents: 975_000, paidOn: "2026-09-01", memo: "Underground" },
  { payeeName: "Holm Excavating LLC", amountCents: 1_860_000, paidOn: "2026-05-20", memo: "Site cut" },
  { payeeName: "Holm Excavating LLC", amountCents: 730_000, paidOn: "2026-10-15", memo: "Backfill" },
];

function confirmedOf(key: "herrera" | "lakeside" | "holm"): ConfirmedCertificate {
  const spec = SAMPLE_CERTIFICATES.find((item) => item.key === key)!;
  const extraction = extractionFromSample(spec, "text");
  return {
    insuredName: extraction.insuredName ?? spec.insuredName,
    additionalInsured: Boolean(extraction.additionalInsured),
    waiverOfSubrogation: Boolean(extraction.waiverOfSubrogation),
    coverages: extraction.coverages,
    note: "",
  };
}

export function emptyDatabase(): Database {
  return {
    version: 1,
    contractors: [],
    subcontractors: [],
    certificates: [],
    payments: [],
    reminders: [],
    outbox: [],
    leads: [],
  };
}

export function buildDemoDatabase(passwordHash: string, now = appNow()): Database {
  const createdAt = now.toISOString();
  const trialEnds = new Date(now.getTime() + 14 * 86_400_000).toISOString();
  const db = emptyDatabase();
  db.contractors.push({
    id: DEMO_CONTRACTOR_ID,
    authUserId: null,
    email: DEMO_EMAIL,
    passwordHash,
    contactName: "Avery North",
    companyName: "Northline Builders",
    address1: "4200 Warehouse Avenue",
    city: "Minneapolis",
    state: "MN",
    postalCode: "55401",
    plan: "free",
    subscriptionStatus: "trialing",
    trialEndsAt: trialEnds,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    auditRescuePurchasedAt: null,
    requirements: DEFAULT_REQUIREMENTS,
    createdAt,
  });
  db.subcontractors = DEMO_SUBS.map((sub) => ({
    ...sub,
    contractorId: DEMO_CONTRACTOR_ID,
    createdAt,
  }));

  const attach = (
    key: "herrera" | "lakeside" | "pine" | "holm",
    subId: string,
    status: "confirmed" | "pending_review",
  ): CertificateRecord => {
    const spec = SAMPLE_CERTIFICATES.find((item) => item.key === key)!;
    const extraction = extractionFromSample(spec, "text");
    return {
      id: randomUUID(),
      contractorId: DEMO_CONTRACTOR_ID,
      subcontractorId: subId,
      blobId: `seed-${key}`,
      filename: spec.filename,
      mimeType: "application/pdf",
      byteSize: 0,
      status,
      extraction,
      confirmed: status === "confirmed" ? confirmedOf(key as "herrera" | "lakeside" | "holm") : null,
      uploadedAt: createdAt,
      confirmedAt: status === "confirmed" ? createdAt : null,
    };
  };

  db.certificates = [
    attach("herrera", DEMO_SUBS[0].id, "confirmed"),
    attach("lakeside", DEMO_SUBS[1].id, "confirmed"),
    attach("pine", DEMO_SUBS[2].id, "pending_review"),
    attach("holm", DEMO_SUBS[4].id, "confirmed"),
  ];
  db.payments = DEMO_PAYMENTS.map((payment) => ({
    ...payment,
    id: randomUUID(),
    contractorId: DEMO_CONTRACTOR_ID,
    importedAt: createdAt,
  }));
  return db;
}
