/** Parse a dollar amount into integer cents. "$1,000,000", "1000000", and "8400.50" are accepted. */
export function parseMoneyToCents(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const negative = cleaned.startsWith("-");
  const [dollars, fraction = ""] = cleaned.replace("-", "").split(".");
  const cents =
    Number(dollars) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  if (!Number.isFinite(cents)) return null;
  return negative ? -cents : cents;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatLimit(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return formatMoney(amount * 100);
}
