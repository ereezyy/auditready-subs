"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSession, setSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireContractor } from "@/lib/auth/current";
import { appNow } from "@/lib/clock";
import { confirmedFromForm } from "@/lib/domain/confirm";
import {
  PAYMENT_CSV_ALIASES,
  SUB_CSV_ALIASES,
  mapCsvRows,
  parseCsv,
} from "@/lib/domain/csv";
import { parseDate } from "@/lib/domain/dates";
import { parseMoneyToCents } from "@/lib/domain/money";
import { effectiveAccess, evaluateSubCapacity } from "@/lib/domain/plans";
import { normalizeRequirements } from "@/lib/domain/requirements";
import { isSupabaseConfigured, stripeMode } from "@/lib/env";
import { sendDueReminders } from "@/lib/reminders/run";
import { DEMO_EMAIL } from "@/lib/seed";
import { getLocalStore, getStore } from "@/lib/store";
import { createCheckoutSession } from "@/lib/stripe/billing";
import { supabaseServer } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contactName = String(formData.get("contactName") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (contactName.length < 2 || companyName.length < 2) {
    return { error: "Enter your name and the company name." };
  }
  if (!emailOk(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };

  const trialEndsAt = new Date(appNow().getTime() + 14 * 86_400_000).toISOString();
  if (isSupabaseConfigured()) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Could not create the account." };
    await getStore().createContractor({
      email,
      passwordHash: null,
      authUserId: data.user.id,
      contactName,
      companyName,
      trialEndsAt,
    });
    if (!data.session) {
      return {
        error:
          "Account created. Confirm the email, then sign in. For the local demo, leave Supabase unset and use the file store.",
      };
    }
    redirect("/app");
  }

  try {
    const contractor = await getStore().createContractor({
      email,
      passwordHash: hashPassword(password),
      contactName,
      companyName,
      trialEndsAt,
    });
    await setSession(contractor.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the account." };
  }
  redirect("/app");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (isSupabaseConfigured()) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Email or password is incorrect." };
    redirect("/app");
  }
  const contractor = await getStore().findContractorByEmail(email);
  if (!contractor || !verifyPassword(password, contractor.passwordHash)) {
    return { error: "Email or password is incorrect." };
  }
  await setSession(contractor.id);
  redirect("/app");
}

export async function enterDemo() {
  if (isSupabaseConfigured()) redirect("/login");
  const contractor = await getStore().findContractorByEmail(DEMO_EMAIL);
  if (!contractor) redirect("/login?error=missing-demo");
  await setSession(contractor.id);
  redirect("/app");
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  await clearSession();
  redirect("/");
}

export async function resetDemo() {
  const local = getLocalStore();
  if (!local) redirect("/app/settings");
  await local.reset();
  await clearSession();
  redirect("/?notice=demo-reset");
}

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contractor = await requireContractor();
  const requirements = normalizeRequirements({
    glEachOccurrence: formData.get("glEachOccurrence"),
    glAggregate: formData.get("glAggregate"),
    requireWc: formData.get("requireWc") === "on",
    wcEachAccident: formData.get("wcEachAccident"),
    requireAuto: formData.get("requireAuto") === "on",
    autoCombinedSingleLimit: formData.get("autoCombinedSingleLimit"),
    requireUmbrella: formData.get("requireUmbrella") === "on",
    umbrellaEachOccurrence: formData.get("umbrellaEachOccurrence"),
    requireAdditionalInsured: formData.get("requireAdditionalInsured") === "on",
    requireWaiver: formData.get("requireWaiver") === "on",
    warningDays: formData.get("warningDays"),
  });
  await getStore().updateContractor(contractor.id, {
    contactName: String(formData.get("contactName") ?? "").trim() || contractor.contactName,
    companyName: String(formData.get("companyName") ?? "").trim() || contractor.companyName,
    address1: String(formData.get("address1") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    postalCode: String(formData.get("postalCode") ?? "").trim(),
    requirements,
  });
  revalidatePath("/app");
  return { ok: "Requirements saved. Status on the dashboard uses these rules." };
}

export async function importSubs(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contractor = await requireContractor();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  const mapped = mapCsvRows(parseCsv(await file.text()), SUB_CSV_ALIASES);
  if (mapped.records.length === 0) {
    return { error: "That CSV has no data rows. Use a header row with a vendor or name column." };
  }
  if (mapped.missing.includes("name")) {
    return { error: `Could not find a name column. Headers seen: ${mapped.headers.join(", ") || "(none)"}.` };
  }
  const rows = mapped.records
    .map((row) => ({
      contractorId: contractor.id,
      name: row.name?.trim() ?? "",
      email: row.email,
      phone: row.phone,
      trade: row.trade,
      agentName: row.agentName,
      agentEmail: row.agentEmail,
    }))
    .filter((row) => row.name.length > 0);
  if (rows.length === 0) return { error: "Every row was missing a name." };
  const store = getStore();
  const current = (await store.listSubs(contractor.id)).length;
  const access = effectiveAccess(contractor, appNow());
  const capacity = evaluateSubCapacity(access, current, rows.length);
  if (!capacity.ok) return { error: capacity.message };
  await store.createSubs(rows);
  revalidatePath("/app");
  redirect(`/app?notice=Imported ${rows.length} subcontractors.`);
}

export async function addSub(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contractor = await requireContractor();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter the subcontractor's name." };
  const store = getStore();
  const current = (await store.listSubs(contractor.id)).length;
  const capacity = evaluateSubCapacity(effectiveAccess(contractor, appNow()), current, 1);
  if (!capacity.ok) return { error: capacity.message };
  const [created] = await store.createSubs([
    {
      contractorId: contractor.id,
      name,
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      trade: String(formData.get("trade") ?? ""),
      agentName: String(formData.get("agentName") ?? ""),
      agentEmail: String(formData.get("agentEmail") ?? ""),
    },
  ]);
  revalidatePath("/app");
  redirect(`/app/subs/${created.id}`);
}

export async function updateSub(subId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const contractor = await requireContractor();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter the subcontractor's name." };
  await getStore().updateSub(contractor.id, subId, {
    name,
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    trade: String(formData.get("trade") ?? "").trim(),
    agentName: String(formData.get("agentName") ?? "").trim(),
    agentEmail: String(formData.get("agentEmail") ?? "").trim(),
  });
  revalidatePath(`/app/subs/${subId}`);
  return { ok: "Subcontractor saved." };
}

export async function deleteSub(subId: string) {
  const contractor = await requireContractor();
  await getStore().deleteSub(contractor.id, subId);
  revalidatePath("/app");
  redirect("/app?notice=Subcontractor removed.");
}

export async function confirmCertificate(formData: FormData) {
  const contractor = await requireContractor();
  const certificateId = String(formData.get("certificateId") ?? "");
  const store = getStore();
  const certificate = await store.getCertificate(contractor.id, certificateId);
  if (!certificate) redirect("/app");
  const confirmed = confirmedFromForm(formData);
  if (!confirmed.insuredName) {
    redirect(`/app/certificates/${certificateId}?error=${encodeURIComponent("Enter the insured name before confirming.")}`);
  }
  await store.updateCertificate(contractor.id, certificateId, {
    status: "confirmed",
    confirmed,
    confirmedAt: new Date().toISOString(),
  });
  revalidatePath("/app");
  redirect(`/app/subs/${certificate.subcontractorId}?notice=Certificate confirmed. It now counts toward status and uncovered dollars.`);
}

export async function importPayments(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contractor = await requireContractor();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a payments CSV." };
  const mapped = mapCsvRows(parseCsv(await file.text()), PAYMENT_CSV_ALIASES);
  if (mapped.missing.length > 0) {
    return {
      error: `Missing column${mapped.missing.length === 1 ? "" : "s"}: ${mapped.missing.join(", ")}. Headers seen: ${mapped.headers.join(", ") || "(none)"}.`,
    };
  }
  const badRows: number[] = [];
  const rows = mapped.records.flatMap((row, index) => {
    const amountCents = parseMoneyToCents(row.amount ?? "");
    const paidOn = parseDate(row.date ?? "");
    if (!row.name?.trim() || amountCents == null || !paidOn) {
      badRows.push(index + 2);
      return [];
    }
    return [{ payeeName: row.name.trim(), amountCents, paidOn, memo: row.memo ?? "" }];
  });
  if (rows.length === 0) {
    return { error: "No payable rows. Each row needs a vendor, a date, and an amount." };
  }
  await getStore().replacePayments(contractor.id, rows);
  revalidatePath("/app/report");
  const skipped = badRows.length ? ` Skipped row${badRows.length === 1 ? "" : "s"} ${badRows.slice(0, 6).join(", ")}.` : "";
  return { ok: `Imported ${rows.length} payments.${skipped}` };
}

export async function runReminders(): Promise<void> {
  const contractor = await requireContractor();
  const access = effectiveAccess(contractor, appNow());
  if (!access.canSendReminders) redirect("/app/reminders?error=plan");
  const result = await sendDueReminders(contractor.id);
  revalidatePath("/app/reminders");
  redirect(`/app/reminders?sent=${result.sent}`);
}

export async function startCheckout(formData: FormData) {
  const contractor = await requireContractor();
  const plan = String(formData.get("plan") ?? "");
  if (plan !== "starter" && plan !== "pro" && plan !== "plus" && plan !== "audit_rescue") {
    redirect("/app/billing");
  }
  if (stripeMode() === "mock") redirect(`/app/billing/checkout?plan=${plan}`);
  const url = await createCheckoutSession({
    contractorId: contractor.id,
    email: contractor.email,
    plan,
  });
  redirect(url);
}

export async function completeMockCheckout(formData: FormData) {
  const contractor = await requireContractor();
  if (stripeMode() !== "mock") redirect("/app/billing");
  const plan = String(formData.get("plan") ?? "");
  const store = getStore();
  if (plan === "audit_rescue") {
    await store.updateContractor(contractor.id, { auditRescuePurchasedAt: new Date().toISOString() });
  } else if (plan === "starter" || plan === "pro" || plan === "plus") {
    await store.updateContractor(contractor.id, {
      plan,
      subscriptionStatus: "active",
      stripeCustomerId: contractor.stripeCustomerId ?? "cus_mock_auditready",
      stripeSubscriptionId: "sub_mock_auditready",
    });
  } else {
    redirect("/app/billing");
  }
  revalidatePath("/app/billing");
  redirect("/app/billing?checkout=success");
}
