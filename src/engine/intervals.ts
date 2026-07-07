import type { Interval } from "./types";

/**
 * Subtract `busy` intervals from a `base` interval, returning the remaining
 * free sub-intervals in order. This is the substrate for computing free study
 * windows (availability − commitments − blocks).
 */
export function subtractIntervals(base: Interval, busy: Interval[]): Interval[] {
  // Walk left-to-right, carving each overlapping busy block out of the base.
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  const free: Interval[] = [];
  let cursor = base.start;

  for (const b of sorted) {
    const overlapStart = Math.max(b.start, base.start);
    const overlapEnd = Math.min(b.end, base.end);
    if (overlapEnd <= overlapStart) continue; // no overlap with base
    if (overlapStart > cursor) free.push({ start: cursor, end: overlapStart });
    cursor = Math.max(cursor, overlapEnd);
  }

  if (cursor < base.end) free.push({ start: cursor, end: base.end });
  return free;
}

/**
 * Merge overlapping/adjacent intervals into a disjoint, sorted set. Drops
 * zero/negative-length intervals. Ensures capacity is never double-counted.
 */
export function normalize(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) {
      last.end = Math.max(last.end, i.end);
    } else {
      out.push({ ...i });
    }
  }
  return out;
}

/**
 * Free windows for a whole day: subtract all `busy` intervals (commitments +
 * blocks) from the day's availability. Availability is normalized first so
 * overlapping windows can't double-count capacity or yield overlapping frees.
 */
export function freeWindows(availability: Interval[], busy: Interval[]): Interval[] {
  const mergedBusy = normalize(busy);
  return normalize(availability).flatMap((w) => subtractIntervals(w, mergedBusy));
}
