import type { Interval } from "../types";
import type { PlacedSession, PlacerInput, PlacerOutput } from "./types";

/**
 * Place each subject's demanded hours into the week's free windows, greedily
 * day-by-day, working in whole SLOTS (multiples of `slotMinutes`) so sessions
 * are always slot-aligned with integer-minute boundaries — never the fractional
 * sessions a raw `hours×60` would produce from weighted allocations.
 *
 * Placed blocks are consumed from the remaining windows, so two subjects can't
 * overlap. Slots that don't fit are surfaced in `unplacedHours` (never dropped).
 * Sessions only ever exist inside a free window, so they can't collide with a
 * fixed commitment or block.
 */
export function place(input: PlacerInput): PlacerOutput {
  const { days, demands, slotMinutes } = input;
  const dayFree = days.map((d) => ({ date: d.date, free: [...d.free] as Interval[] }));
  const sessions: PlacedSession[] = [];
  const unplacedHours: Record<string, number> = {};

  for (const demand of demands) {
    // Round the (possibly fractional) demand to a whole number of slots.
    let remainingSlots = Math.round((demand.hours * 60) / slotMinutes);

    for (const day of dayFree) {
      if (remainingSlots <= 0) break;
      const nextFree: Interval[] = [];

      for (const window of day.free) {
        const windowSlots = Math.floor((window.end - window.start) / slotMinutes);
        const take = remainingSlots > 0 ? Math.min(remainingSlots, windowSlots) : 0;
        if (take <= 0) {
          nextFree.push(window);
          continue;
        }
        const end = window.start + take * slotMinutes;
        sessions.push({
          date: day.date,
          subjectId: demand.subjectId,
          interval: { start: window.start, end },
        });
        remainingSlots -= take;
        if (end < window.end) nextFree.push({ start: end, end: window.end });
      }

      day.free = nextFree;
    }

    if (remainingSlots > 0) {
      unplacedHours[demand.subjectId] = (remainingSlots * slotMinutes) / 60;
    }
  }

  return { sessions, unplacedHours };
}
