/** Clock for status, trials, and reminders. DEMO_TODAY freezes the demo on the sample policy dates. */
export function appNow(): Date {
  const override = process.env.DEMO_TODAY?.trim();
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return new Date(`${override}T16:00:00.000Z`);
  }
  return new Date();
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:43123").replace(/\/$/, "");
}
