const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function validIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse a certificate or CSV date into YYYY-MM-DD. Returns null when it is not a real date. */
export function parseDate(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = String(value).trim();
  if (!v) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return validIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const us = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(v);
  if (us) {
    let year = Number(us[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return validIso(year, Number(us[1]), Number(us[2]));
  }

  const named = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(v);
  if (named) {
    const month = MONTHS[named[1].toLowerCase().slice(0, 3)];
    if (!month) return null;
    return validIso(Number(named[3]), month, Number(named[2]));
  }

  return null;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function todayIso(
  now = new Date(),
  timeZone = process.env.APP_TIMEZONE || "America/Chicago",
): string {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return formatted;
}

export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = parseDate(iso);
  if (!parsed) return iso;
  const [year, month, day] = parsed.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
