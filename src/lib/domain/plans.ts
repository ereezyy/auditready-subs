import type { PlanId, SubscriptionStatus } from "@/lib/domain/types";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  monthlyCents: number;
  subLimit: number | null;
  blurb: string;
  features: string[];
};

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    monthlyCents: 0,
    subLimit: 3,
    blurb: "See the shape of the problem on a small crew.",
    features: [
      "3 subcontractors",
      "Certificate status",
      "Uncovered-dollars preview",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    monthlyCents: 1900,
    subLimit: 15,
    blurb: "A remodeler or small GC with a steady sub list.",
    features: [
      "15 subcontractors",
      "Renewal reminders",
      "Uncovered-dollars report",
      "Audit packet",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyCents: 3900,
    subLimit: 50,
    blurb: "The plan the 14-day trial uses.",
    features: [
      "50 subcontractors",
      "Everything in Starter",
      "Agent CC on reminders",
      "One-click audit packet",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    monthlyCents: 7900,
    subLimit: null,
    blurb: "No cap, for the GC who pays a long vendor list.",
    features: [
      "Unlimited subcontractors",
      "Everything in Pro",
      "Same reminders and packet",
    ],
  },
];

export const AUDIT_RESCUE_CENTS = 14900;
export const TRIAL_DAYS = 14;

export type Access = {
  planId: PlanId;
  planName: string;
  subLimit: number;
  unlimited: boolean;
  inTrial: boolean;
  trialDaysLeft: number | null;
  paid: boolean;
  pastDue: boolean;
  canSendReminders: boolean;
  canGeneratePacket: boolean;
  label: string;
};

type AccountLike = {
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  auditRescuePurchasedAt: string | null;
};

function planDef(id: PlanId): PlanDefinition {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

function limitOf(id: PlanId): number {
  const limit = planDef(id).subLimit;
  return limit == null ? Number.POSITIVE_INFINITY : limit;
}

export function trialDaysLeft(trialEndsAt: string | null, now: Date): number | null {
  if (!trialEndsAt) return null;
  const end = Date.parse(trialEndsAt);
  if (!Number.isFinite(end)) return null;
  const ms = end - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

export function effectiveAccess(account: AccountLike, now: Date): Access {
  const paid =
    account.subscriptionStatus === "active" || account.subscriptionStatus === "past_due";
  const days = trialDaysLeft(account.trialEndsAt, now);
  const inTrial = !paid && days != null && days > 0;
  const planId: PlanId = paid ? account.plan : inTrial ? "pro" : "free";
  const def = planDef(planId);
  const unlimited = def.subLimit == null;
  const entitled = paid || inTrial || Boolean(account.auditRescuePurchasedAt);
  const packet =
    Boolean(account.auditRescuePurchasedAt) || paid || inTrial;

  let label = def.name;
  if (inTrial) label = `Pro trial · ${days} day${days === 1 ? "" : "s"} left`;
  else if (account.subscriptionStatus === "past_due") label = `${def.name} · payment past due`;
  else if (paid) label = def.name;
  else if (account.auditRescuePurchasedAt) label = "Free · Audit Rescue";
  else label = "Free";

  return {
    planId,
    planName: def.name,
    subLimit: limitOf(planId),
    unlimited,
    inTrial,
    trialDaysLeft: inTrial ? days : null,
    paid,
    pastDue: account.subscriptionStatus === "past_due",
    canSendReminders: entitled && (paid || inTrial),
    canGeneratePacket: packet,
    label,
  };
}

export type CapacityResult =
  | { ok: true; limit: number }
  | { ok: false; limit: number; message: string };

export function evaluateSubCapacity(
  access: Access,
  currentCount: number,
  adding: number,
): CapacityResult {
  const limit = access.subLimit;
  if (!Number.isFinite(limit) || currentCount + adding <= limit) {
    return { ok: true, limit };
  }
  const plan = access.inTrial ? "the Pro trial" : access.planName;
  const room = Math.max(0, limit - currentCount);
  const message = Number.isFinite(limit)
    ? `${plan} includes ${limit} subcontractors. You have ${currentCount} and this adds ${adding}${room > 0 ? ` — only ${room} slot${room === 1 ? "" : "s"} left` : ""}. Upgrade the plan or import fewer rows.`
    : "This import exceeds the plan limit.";
  return { ok: false, limit, message };
}
