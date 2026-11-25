import { describe, expect, it } from "vitest";
import { effectiveAccess, evaluateSubCapacity, TRIAL_DAYS } from "@/lib/domain/plans";
import { dueMilestone } from "@/lib/domain/reminders";

const NOW = new Date("2026-11-25T15:00:00.000Z");

function account(overrides: Partial<{
  plan: "free" | "starter" | "pro" | "plus";
  subscriptionStatus: "none" | "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt: string | null;
  auditRescuePurchasedAt: string | null;
}> = {}) {
  return {
    plan: "free" as const,
    subscriptionStatus: "trialing" as const,
    trialEndsAt: "2026-12-09T15:00:00.000Z",
    auditRescuePurchasedAt: null,
    ...overrides,
  };
}

describe("plan limits", () => {
  it("gives a new trial Pro capacity for 14 days", () => {
    const access = effectiveAccess(account(), NOW);
    expect(TRIAL_DAYS).toBe(14);
    expect(access.inTrial).toBe(true);
    expect(access.planId).toBe("pro");
    expect(access.subLimit).toBe(50);
    expect(access.canGeneratePacket).toBe(true);
    expect(evaluateSubCapacity(access, 49, 1).ok).toBe(true);
    expect(evaluateSubCapacity(access, 49, 2).ok).toBe(false);
  });

  it("drops an expired trial back to the free cap of 3", () => {
    const access = effectiveAccess(
      account({ trialEndsAt: "2026-11-01T00:00:00.000Z", subscriptionStatus: "canceled" }),
      NOW,
    );
    expect(access.inTrial).toBe(false);
    expect(access.planId).toBe("free");
    expect(access.subLimit).toBe(3);
    expect(access.canGeneratePacket).toBe(false);
    const blocked = evaluateSubCapacity(access, 3, 1);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.message).toMatch(/3 subcontractors/);
    expect(evaluateSubCapacity(access, 0, 3).ok).toBe(true);
    expect(evaluateSubCapacity(access, 2, 2).ok).toBe(false);
  });

  it("enforces Starter, Pro, and Plus limits on a paid subscription", () => {
    const starter = effectiveAccess(
      account({ plan: "starter", subscriptionStatus: "active", trialEndsAt: null }),
      NOW,
    );
    expect(starter.subLimit).toBe(15);
    expect(starter.inTrial).toBe(false);
    expect(evaluateSubCapacity(starter, 15, 1).ok).toBe(false);
    expect(evaluateSubCapacity(starter, 10, 5).ok).toBe(true);

    const pro = effectiveAccess(
      account({ plan: "pro", subscriptionStatus: "past_due" }),
      NOW,
    );
    expect(pro.pastDue).toBe(true);
    expect(pro.subLimit).toBe(50);
    expect(evaluateSubCapacity(pro, 50, 1).ok).toBe(false);

    const plus = effectiveAccess(
      account({ plan: "plus", subscriptionStatus: "active" }),
      NOW,
    );
    expect(plus.unlimited).toBe(true);
    expect(evaluateSubCapacity(plus, 400, 25).ok).toBe(true);
  });

  it("does not let Audit Rescue raise the subcontractor cap", () => {
    const access = effectiveAccess(
      account({
        subscriptionStatus: "none",
        trialEndsAt: "2026-10-01T00:00:00.000Z",
        auditRescuePurchasedAt: "2026-11-02T00:00:00.000Z",
      }),
      NOW,
    );
    expect(access.planId).toBe("free");
    expect(access.subLimit).toBe(3);
    expect(access.canGeneratePacket).toBe(true);
    expect(access.canSendReminders).toBe(false);
    expect(evaluateSubCapacity(access, 3, 1).ok).toBe(false);
  });
});

describe("reminder windows", () => {
  it("picks the tightest milestone and does not repeat it", () => {
    expect(dueMilestone(31, [])).toBeNull();
    expect(dueMilestone(30, [])).toBe(30);
    expect(dueMilestone(20, [])).toBe(30);
    expect(dueMilestone(14, [])).toBe(14);
    expect(dueMilestone(10, [])).toBe(14);
    expect(dueMilestone(10, [14])).toBeNull();
    expect(dueMilestone(7, [14])).toBe(7);
    expect(dueMilestone(0, [])).toBe(0);
    expect(dueMilestone(-1, [])).toBeNull();
  });
});
