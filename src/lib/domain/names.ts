const LEGAL_SUFFIX =
  /\b(llc|l\.l\.c|inc|incorporated|co|corp|corporation|company|ltd|llp|pllc)\b/g;

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(LEGAL_SUFFIX, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (shorter.length < 6) return false;
  return longer.startsWith(`${shorter} `) || longer === shorter;
}
