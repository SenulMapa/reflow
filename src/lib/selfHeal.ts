/**
 * Self-healing plan — "falling behind becomes the app's best moment." When the
 * student misses sessions, re-fit the REMAINING weekly goal into the days from
 * today onward: past days are fixed history (no placement), and hours already
 * banked this week are subtracted so we only reschedule what's actually left.
 *
 * Pure transform on a WeekInput — the placer then does the real redistribution.
 */
import type { WeekInput } from "../engine/week";

export function reflowRemaining(input: WeekInput, fromISO: string, bankedHours: number): WeekInput {
  const days = input.days.map((d) =>
    d.date < fromISO ? { ...d, availability: [] } : { ...d, availability: d.availability.map((w) => ({ ...w })) }
  );
  const weeklyGoalHours = Math.max(0, input.weeklyGoalHours - bankedHours);
  return { ...input, days, weeklyGoalHours };
}
