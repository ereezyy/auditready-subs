export const REMINDER_MILESTONES = [30, 14, 7, 0] as const;
export type ReminderMilestone = (typeof REMINDER_MILESTONES)[number];

/**
 * The reminder that applies today is the tightest milestone already reached.
 * A certificate 10 days from expiry gets the 14-day note, not a late 30-day note.
 * Expired certificates are a status gap, not another reminder.
 */
export function dueMilestone(
  daysLeft: number,
  alreadySent: number[],
): ReminderMilestone | null {
  if (daysLeft < 0) return null;
  const eligible = REMINDER_MILESTONES.filter((milestone) => milestone >= daysLeft);
  if (eligible.length === 0) return null;
  const window = Math.min(...eligible) as ReminderMilestone;
  if (alreadySent.includes(window)) return null;
  return window;
}
