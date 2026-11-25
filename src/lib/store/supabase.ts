import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { normalizeRequirements } from "@/lib/domain/requirements";
import type { ConfirmedCertificate, Extraction, PlanId, SubscriptionStatus } from "@/lib/domain/types";
import type {
  CertificateRecord,
  ContractorRecord,
  NewCertificate,
  NewContractor,
  NewSubcontractor,
  OutboxRecord,
  PaymentRecord,
  ReminderRecord,
  Store,
  StoredBlob,
  SubcontractorRecord,
} from "@/lib/store/types";

let adminClient: SupabaseClient | null = null;

function admin(): SupabaseClient {
  adminClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return adminClient;
}

function must<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

function contractorFrom(row: Record<string, unknown>): ContractorRecord {
  return {
    id: String(row.id),
    authUserId: (row.auth_user_id as string | null) ?? null,
    email: String(row.email),
    passwordHash: null,
    contactName: String(row.contact_name ?? ""),
    companyName: String(row.company_name ?? ""),
    address1: String(row.address1 ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    postalCode: String(row.postal_code ?? ""),
    plan: row.plan as PlanId,
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    trialEndsAt: (row.trial_ends_at as string | null) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    auditRescuePurchasedAt: (row.audit_rescue_purchased_at as string | null) ?? null,
    requirements: normalizeRequirements(row.requirements),
    createdAt: String(row.created_at),
  };
}

function subFrom(row: Record<string, unknown>): SubcontractorRecord {
  return {
    id: String(row.id),
    contractorId: String(row.contractor_id),
    name: String(row.name),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    trade: String(row.trade ?? ""),
    agentName: String(row.agent_name ?? ""),
    agentEmail: String(row.agent_email ?? ""),
    uploadToken: String(row.upload_token),
    createdAt: String(row.created_at),
  };
}

function certFrom(row: Record<string, unknown>): CertificateRecord {
  return {
    id: String(row.id),
    contractorId: String(row.contractor_id),
    subcontractorId: String(row.subcontractor_id),
    blobId: String(row.blob_id),
    filename: String(row.filename),
    mimeType: String(row.mime_type),
    byteSize: Number(row.byte_size ?? 0),
    status: row.status as CertificateRecord["status"],
    extraction: (row.extraction as Extraction | null) ?? null,
    confirmed: (row.confirmed as ConfirmedCertificate | null) ?? null,
    uploadedAt: String(row.uploaded_at),
    confirmedAt: (row.confirmed_at as string | null) ?? null,
  };
}

function contractorPatch(patch: Partial<ContractorRecord>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.contactName !== undefined) row.contact_name = patch.contactName;
  if (patch.companyName !== undefined) row.company_name = patch.companyName;
  if (patch.address1 !== undefined) row.address1 = patch.address1;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.postalCode !== undefined) row.postal_code = patch.postalCode;
  if (patch.plan !== undefined) row.plan = patch.plan;
  if (patch.subscriptionStatus !== undefined) row.subscription_status = patch.subscriptionStatus;
  if (patch.trialEndsAt !== undefined) row.trial_ends_at = patch.trialEndsAt;
  if (patch.stripeCustomerId !== undefined) row.stripe_customer_id = patch.stripeCustomerId;
  if (patch.stripeSubscriptionId !== undefined) row.stripe_subscription_id = patch.stripeSubscriptionId;
  if (patch.auditRescuePurchasedAt !== undefined) row.audit_rescue_purchased_at = patch.auditRescuePurchasedAt;
  if (patch.requirements !== undefined) row.requirements = normalizeRequirements(patch.requirements);
  if (patch.authUserId !== undefined) row.auth_user_id = patch.authUserId;
  if (patch.passwordHash !== undefined) {
    // Passwords stay in Supabase Auth, not in this table.
  }
  return row;
}

export class SupabaseStore implements Store {
  async findContractorById(id: string) {
    const data = must(
      await admin().from("contractors").select("*").eq("id", id).maybeSingle(),
      "find contractor",
    );
    return data ? contractorFrom(data) : null;
  }
  async findContractorByEmail(email: string) {
    const data = must(
      await admin().from("contractors").select("*").eq("email", email.trim().toLowerCase()).maybeSingle(),
      "find contractor email",
    );
    return data ? contractorFrom(data) : null;
  }
  async findContractorByAuthUserId(authUserId: string) {
    const data = must(
      await admin().from("contractors").select("*").eq("auth_user_id", authUserId).maybeSingle(),
      "find contractor auth",
    );
    return data ? contractorFrom(data) : null;
  }
  async findContractorByStripeCustomer(customerId: string) {
    const data = must(
      await admin().from("contractors").select("*").eq("stripe_customer_id", customerId).maybeSingle(),
      "find contractor stripe",
    );
    return data ? contractorFrom(data) : null;
  }
  async listContractors() {
    const data = must(await admin().from("contractors").select("*"), "list contractors");
    return (data as Record<string, unknown>[]).map(contractorFrom);
  }
  async createContractor(input: NewContractor) {
    const row = {
      email: input.email.trim().toLowerCase(),
      auth_user_id: input.authUserId ?? null,
      contact_name: input.contactName.trim(),
      company_name: input.companyName.trim(),
      plan: "free",
      subscription_status: input.subscriptionStatus ?? "trialing",
      trial_ends_at: input.trialEndsAt,
      requirements: normalizeRequirements({}),
    };
    const data = must(await admin().from("contractors").insert(row).select("*").single(), "create contractor");
    return contractorFrom(data);
  }
  async updateContractor(id: string, patch: Partial<Omit<ContractorRecord, "id" | "email" | "createdAt">>) {
    const data = must(
      await admin().from("contractors").update(contractorPatch(patch)).eq("id", id).select("*").single(),
      "update contractor",
    );
    return contractorFrom(data);
  }
  async listSubs(contractorId: string) {
    const data = must(
      await admin().from("subcontractors").select("*").eq("contractor_id", contractorId).order("name"),
      "list subs",
    );
    return (data as Record<string, unknown>[]).map(subFrom);
  }
  async createSubs(inputs: NewSubcontractor[]) {
    const rows = inputs.map((input) => ({
      contractor_id: input.contractorId,
      name: input.name.trim(),
      email: input.email?.trim() ?? "",
      phone: input.phone?.trim() ?? "",
      trade: input.trade?.trim() ?? "",
      agent_name: input.agentName?.trim() ?? "",
      agent_email: input.agentEmail?.trim() ?? "",
      upload_token: randomBytes(18).toString("base64url"),
    }));
    const data = must(await admin().from("subcontractors").insert(rows).select("*"), "create subs");
    return (data as Record<string, unknown>[]).map(subFrom);
  }
  async getSub(contractorId: string, id: string) {
    const data = must(
      await admin()
        .from("subcontractors")
        .select("*")
        .eq("contractor_id", contractorId)
        .eq("id", id)
        .maybeSingle(),
      "get sub",
    );
    return data ? subFrom(data) : null;
  }
  async getSubByToken(uploadToken: string) {
    const data = must(
      await admin().from("subcontractors").select("*").eq("upload_token", uploadToken).maybeSingle(),
      "get sub token",
    );
    return data ? subFrom(data) : null;
  }
  async updateSub(contractorId: string, id: string, patch: Partial<SubcontractorRecord>) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.trade !== undefined) row.trade = patch.trade;
    if (patch.agentName !== undefined) row.agent_name = patch.agentName;
    if (patch.agentEmail !== undefined) row.agent_email = patch.agentEmail;
    const data = must(
      await admin()
        .from("subcontractors")
        .update(row)
        .eq("contractor_id", contractorId)
        .eq("id", id)
        .select("*")
        .single(),
      "update sub",
    );
    return subFrom(data);
  }
  async deleteSub(contractorId: string, id: string) {
    must(
      await admin().from("subcontractors").delete().eq("contractor_id", contractorId).eq("id", id),
      "delete sub",
    );
  }
  async listCertificates(contractorId: string, subcontractorId?: string) {
    let query = admin()
      .from("certificates")
      .select("*")
      .eq("contractor_id", contractorId)
      .order("uploaded_at", { ascending: false });
    if (subcontractorId) query = query.eq("subcontractor_id", subcontractorId);
    const data = must(await query, "list certificates");
    return (data as Record<string, unknown>[]).map(certFrom);
  }
  async getCertificate(contractorId: string, id: string) {
    const data = must(
      await admin()
        .from("certificates")
        .select("*")
        .eq("contractor_id", contractorId)
        .eq("id", id)
        .maybeSingle(),
      "get certificate",
    );
    return data ? certFrom(data) : null;
  }
  async addCertificate(input: NewCertificate) {
    const data = must(
      await admin()
        .from("certificates")
        .insert({
          contractor_id: input.contractorId,
          subcontractor_id: input.subcontractorId,
          blob_id: input.blobId,
          filename: input.filename,
          mime_type: input.mimeType,
          byte_size: input.byteSize,
          status: "pending_review",
          extraction: input.extraction,
        })
        .select("*")
        .single(),
      "add certificate",
    );
    return certFrom(data);
  }
  async updateCertificate(contractorId: string, id: string, patch: Partial<CertificateRecord>) {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.confirmed !== undefined) row.confirmed = patch.confirmed;
    if (patch.confirmedAt !== undefined) row.confirmed_at = patch.confirmedAt;
    if (patch.extraction !== undefined) row.extraction = patch.extraction;
    const data = must(
      await admin()
        .from("certificates")
        .update(row)
        .eq("contractor_id", contractorId)
        .eq("id", id)
        .select("*")
        .single(),
      "update certificate",
    );
    return certFrom(data);
  }
  async replacePayments(contractorId: string, rows: Omit<PaymentRecord, "id" | "contractorId" | "importedAt">[]) {
    must(await admin().from("payments").delete().eq("contractor_id", contractorId), "clear payments");
    if (rows.length === 0) return [];
    const data = must(
      await admin()
        .from("payments")
        .insert(
          rows.map((row) => ({
            contractor_id: contractorId,
            payee_name: row.payeeName,
            amount_cents: row.amountCents,
            paid_on: row.paidOn,
            memo: row.memo,
          })),
        )
        .select("*"),
      "insert payments",
    );
    return (data as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      contractorId,
      payeeName: String(row.payee_name),
      amountCents: Number(row.amount_cents),
      paidOn: String(row.paid_on),
      memo: String(row.memo ?? ""),
      importedAt: String(row.imported_at),
    }));
  }
  async listPayments(contractorId: string) {
    const data = must(
      await admin().from("payments").select("*").eq("contractor_id", contractorId).order("paid_on"),
      "list payments",
    );
    return (data as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      contractorId,
      payeeName: String(row.payee_name),
      amountCents: Number(row.amount_cents),
      paidOn: String(row.paid_on).slice(0, 10),
      memo: String(row.memo ?? ""),
      importedAt: String(row.imported_at),
    }));
  }
  async listReminders(contractorId: string) {
    const data = must(
      await admin().from("reminders").select("*").eq("contractor_id", contractorId),
      "list reminders",
    );
    return (data as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      contractorId,
      subcontractorId: String(row.subcontractor_id),
      certificateId: (row.certificate_id as string | null) ?? null,
      milestone: Number(row.milestone),
      expiryDate: String(row.expiry_date).slice(0, 10),
      sentAt: String(row.sent_at),
    }));
  }
  async addReminder(input: Omit<ReminderRecord, "id" | "sentAt"> & { sentAt?: string }) {
    const data = must(
      await admin()
        .from("reminders")
        .insert({
          contractor_id: input.contractorId,
          subcontractor_id: input.subcontractorId,
          certificate_id: input.certificateId,
          milestone: input.milestone,
          expiry_date: input.expiryDate,
        })
        .select("*")
        .single(),
      "add reminder",
    );
    return {
      id: String(data.id),
      contractorId: input.contractorId,
      subcontractorId: input.subcontractorId,
      certificateId: input.certificateId,
      milestone: input.milestone,
      expiryDate: input.expiryDate,
      sentAt: String(data.sent_at),
    };
  }
  async addOutbox(input: Omit<OutboxRecord, "id" | "createdAt">) {
    const data = must(
      await admin()
        .from("outbox")
        .insert({
          contractor_id: input.contractorId,
          to_email: input.toEmail,
          cc_email: input.ccEmail,
          subject: input.subject,
          body: input.body,
        })
        .select("*")
        .single(),
      "add outbox",
    );
    return {
      ...input,
      id: String(data.id),
      createdAt: String(data.created_at),
    };
  }
  async listOutbox(contractorId: string) {
    const data = must(
      await admin().from("outbox").select("*").eq("contractor_id", contractorId).order("created_at", { ascending: false }),
      "list outbox",
    );
    return (data as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      contractorId,
      toEmail: String(row.to_email),
      ccEmail: (row.cc_email as string | null) ?? null,
      subject: String(row.subject),
      body: String(row.body),
      createdAt: String(row.created_at),
    }));
  }
  async addLead(input: { email: string; source: string; summary: unknown }) {
    must(
      await admin().from("leads").insert({ email: input.email, source: input.source, summary: input.summary }),
      "add lead",
    );
  }
  async putBlob(blobId: string, bytes: Buffer, meta: { mimeType: string; filename: string }) {
    const result = await admin()
      .storage.from("certificates")
      .upload(blobId, bytes, { contentType: meta.mimeType, upsert: true });
    if (result.error) throw new Error(`store certificate: ${result.error.message}`);
  }
  async getBlob(blobId: string): Promise<StoredBlob | null> {
    const result = await admin().storage.from("certificates").download(blobId);
    if (result.error || !result.data) return null;
    const bytes = Buffer.from(await result.data.arrayBuffer());
    return { bytes, mimeType: result.data.type || "application/octet-stream", filename: "certificate" };
  }
}
