import type { Interval } from "../types.js";
import type { PlacedSession, PlacerInput, PlacerOutput } from "./types.js";

const DEFAULT_MAX_SESSION_MIN = 120;

/**
 * Place each subject's demanded hours into the week's free windows.
 *
 * Placement is ROUND-ROBIN across subjects with a per-session length cap, so no
 * single subject monopolizes a day and long stretches get broken up (anti-
 * cramming / interleaving — learning-science backed). Sessions are slot-aligned
 * (integer minutes), consumed from the free windows so two can never overlap, and
 * hours that don't fit are surfaced in `unplacedHours` (never silently dropped).
 * Sessions only ever exist inside a free window, so they can't collide with a
 * fixed commitment or block.
 */
export function place(input: PlacerInput): PlacerOutput {
  const { days, demands, slotMinutes } = input;
  const maxSlots = Math.max(1, Math.floor((input.maxSessionMinutes ?? DEFAULT_MAX_SESSION_MIN) / slotMinutes));
  const dayFree = days.map((d) => ({ date: d.date, free: [...d.free] as Interval[] }));
  const sessions: PlacedSession[] = [];
  const remaining = new Map(
    demands.map((d) => [d.subjectId, Math.round((d.hours * 60) / slotMinutes)])
  );

  // Place one capped session for a subject into the earliest window with room.
  // Returns the number of slots placed (0 if nothing fit anywhere).
  function placeOne(subjectId: string): number {
    const want = Math.min(remaining.get(subjectId) ?? 0, maxSlots);
    if (want <= 0) return 0;
    for (const day of dayFree) {
      for (let i = 0; i < day.free.length; i++) {
        const w = day.free[i]!;
        const cap = Math.floor((w.end - w.start) / slotMinutes);
        if (cap <= 0) continue;
        const take = Math.min(want, cap);
        const end = w.start + take * slotMinutes;
        sessions.push({ date: day.date, subjectId, interval: { start: w.start, end } });
        if (end < w.end) day.free[i] = { start: end, end: w.end };
        else day.free.splice(i, 1);
        return take;
      }
    }
    return 0;
  }

  // Round-robin over subjects until no one can place anything more.
  let progress = true;
  while (progress) {
    progress = false;
    for (const demand of demands) {
      if ((remaining.get(demand.subjectId) ?? 0) <= 0) continue;
      const placed = placeOne(demand.subjectId);
      if (placed > 0) {
        remaining.set(demand.subjectId, (remaining.get(demand.subjectId) ?? 0) - placed);
        progress = true;
      }
    }
  }

  const unplacedHours: Record<string, number> = {};
  for (const [subjectId, slots] of remaining) {
    if (slots > 0) unplacedHours[subjectId] = (slots * slotMinutes) / 60;
  }
  return { sessions, unplacedHours };
}
