import type { Requirements } from "@/lib/domain/types";

export const DEFAULT_REQUIREMENTS: Requirements = {
  glEachOccurrence: 1_000_000,
  glAggregate: 2_000_000,
  requireWc: true,
  wcEachAccident: 1_000_000,
  requireAuto: false,
  autoCombinedSingleLimit: 1_000_000,
  requireUmbrella: false,
  umbrellaEachOccurrence: 1_000_000,
  requireAdditionalInsured: true,
  requireWaiver: false,
  warningDays: 30,
};

function numberField(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

function boolField(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "on" || value === "yes") return true;
  if (value === "false" || value === "off" || value === "no") return false;
  return fallback;
}

export function normalizeRequirements(value: unknown): Requirements {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    glEachOccurrence: numberField(
      raw.glEachOccurrence,
      DEFAULT_REQUIREMENTS.glEachOccurrence,
    ),
    glAggregate: numberField(raw.glAggregate, DEFAULT_REQUIREMENTS.glAggregate),
    requireWc: boolField(raw.requireWc, DEFAULT_REQUIREMENTS.requireWc),
    wcEachAccident: numberField(raw.wcEachAccident, DEFAULT_REQUIREMENTS.wcEachAccident),
    requireAuto: boolField(raw.requireAuto, DEFAULT_REQUIREMENTS.requireAuto),
    autoCombinedSingleLimit: numberField(
      raw.autoCombinedSingleLimit,
      DEFAULT_REQUIREMENTS.autoCombinedSingleLimit,
    ),
    requireUmbrella: boolField(
      raw.requireUmbrella,
      DEFAULT_REQUIREMENTS.requireUmbrella,
    ),
    umbrellaEachOccurrence: numberField(
      raw.umbrellaEachOccurrence,
      DEFAULT_REQUIREMENTS.umbrellaEachOccurrence,
    ),
    requireAdditionalInsured: boolField(
      raw.requireAdditionalInsured,
      DEFAULT_REQUIREMENTS.requireAdditionalInsured,
    ),
    requireWaiver: boolField(raw.requireWaiver, DEFAULT_REQUIREMENTS.requireWaiver),
    warningDays: Math.min(
      180,
      numberField(raw.warningDays, DEFAULT_REQUIREMENTS.warningDays),
    ),
  };
}
