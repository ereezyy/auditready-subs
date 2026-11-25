import type {
  ConfirmedCertificate,
  Extraction,
  PlanId,
  Requirements,
  SubscriptionStatus,
} from "@/lib/domain/types";

export type ContractorRecord = {
  id: string;
  authUserId: string | null;
  email: string;
  passwordHash: string | null;
  contactName: string;
  companyName: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  auditRescuePurchasedAt: string | null;
  requirements: Requirements;
  createdAt: string;
};

export type SubcontractorRecord = {
  id: string;
  contractorId: string;
  name: string;
  email: string;
  phone: string;
  trade: string;
  agentName: string;
  agentEmail: string;
  uploadToken: string;
  createdAt: string;
};

export type CertificateStatus = "pending_review" | "confirmed" | "rejected";

export type CertificateRecord = {
  id: string;
  contractorId: string;
  subcontractorId: string;
  blobId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  status: CertificateStatus;
  extraction: Extraction | null;
  confirmed: ConfirmedCertificate | null;
  uploadedAt: string;
  confirmedAt: string | null;
};

export type PaymentRecord = {
  id: string;
  contractorId: string;
  payeeName: string;
  amountCents: number;
  paidOn: string;
  memo: string;
  importedAt: string;
};

export type ReminderRecord = {
  id: string;
  contractorId: string;
  subcontractorId: string;
  certificateId: string | null;
  milestone: number;
  expiryDate: string;
  sentAt: string;
};

export type OutboxRecord = {
  id: string;
  contractorId: string | null;
  toEmail: string;
  ccEmail: string | null;
  subject: string;
  body: string;
  createdAt: string;
};

export type LeadRecord = {
  id: string;
  email: string;
  source: string;
  summary: unknown;
  createdAt: string;
};

export type StoredBlob = {
  bytes: Buffer;
  mimeType: string;
  filename: string;
};

export type Database = {
  version: 1;
  contractors: ContractorRecord[];
  subcontractors: SubcontractorRecord[];
  certificates: CertificateRecord[];
  payments: PaymentRecord[];
  reminders: ReminderRecord[];
  outbox: OutboxRecord[];
  leads: LeadRecord[];
};

export type NewContractor = {
  email: string;
  passwordHash: string | null;
  authUserId?: string | null;
  contactName: string;
  companyName: string;
  trialEndsAt: string | null;
  subscriptionStatus?: SubscriptionStatus;
};

export type NewSubcontractor = {
  contractorId: string;
  name: string;
  email?: string;
  phone?: string;
  trade?: string;
  agentName?: string;
  agentEmail?: string;
};

export type NewCertificate = {
  contractorId: string;
  subcontractorId: string;
  blobId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  extraction: Extraction | null;
};

export interface Store {
  findContractorById(id: string): Promise<ContractorRecord | null>;
  findContractorByEmail(email: string): Promise<ContractorRecord | null>;
  findContractorByAuthUserId(authUserId: string): Promise<ContractorRecord | null>;
  findContractorByStripeCustomer(customerId: string): Promise<ContractorRecord | null>;
  listContractors(): Promise<ContractorRecord[]>;
  createContractor(input: NewContractor): Promise<ContractorRecord>;
  updateContractor(
    id: string,
    patch: Partial<Omit<ContractorRecord, "id" | "email" | "createdAt">>,
  ): Promise<ContractorRecord>;

  listSubs(contractorId: string): Promise<SubcontractorRecord[]>;
  createSubs(inputs: NewSubcontractor[]): Promise<SubcontractorRecord[]>;
  getSub(contractorId: string, id: string): Promise<SubcontractorRecord | null>;
  getSubByToken(token: string): Promise<SubcontractorRecord | null>;
  updateSub(
    contractorId: string,
    id: string,
    patch: Partial<Pick<SubcontractorRecord, "name" | "email" | "phone" | "trade" | "agentName" | "agentEmail">>,
  ): Promise<SubcontractorRecord>;
  deleteSub(contractorId: string, id: string): Promise<void>;

  listCertificates(contractorId: string, subcontractorId?: string): Promise<CertificateRecord[]>;
  getCertificate(contractorId: string, id: string): Promise<CertificateRecord | null>;
  addCertificate(input: NewCertificate): Promise<CertificateRecord>;
  updateCertificate(
    contractorId: string,
    id: string,
    patch: Partial<Pick<CertificateRecord, "status" | "confirmed" | "confirmedAt" | "extraction">>,
  ): Promise<CertificateRecord>;

  replacePayments(
    contractorId: string,
    rows: Omit<PaymentRecord, "id" | "contractorId" | "importedAt">[],
  ): Promise<PaymentRecord[]>;
  listPayments(contractorId: string): Promise<PaymentRecord[]>;

  listReminders(contractorId: string): Promise<ReminderRecord[]>;
  addReminder(input: Omit<ReminderRecord, "id" | "sentAt"> & { sentAt?: string }): Promise<ReminderRecord>;

  addOutbox(input: Omit<OutboxRecord, "id" | "createdAt">): Promise<OutboxRecord>;
  listOutbox(contractorId: string): Promise<OutboxRecord[]>;
  addLead(input: Omit<LeadRecord, "id" | "createdAt">): Promise<void>;

  putBlob(blobId: string, bytes: Buffer, meta: { mimeType: string; filename: string }): Promise<void>;
  getBlob(blobId: string): Promise<StoredBlob | null>;
}
