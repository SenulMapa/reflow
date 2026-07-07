import { describe, expect, test } from "vitest";
import { place } from "./placer";
import type { PlacedSession, PlacerInput } from "./types";

const minutesFor = (sessions: PlacedSession[], subjectId: string) =>
  sessions
    .filter((s) => s.subjectId === subjectId)
    .reduce((t, s) => t + (s.interval.end - s.interval.start), 0);

describe("place", () => {
  test("places a subject's demanded hours inside the day's free window", () => {
    const input: PlacerInput = {
      slotMinutes: 30,
      days: [{ date: "2027-05-01", free: [{ start: 540, end: 660 }] }], // 09:00–11:00 = 2h
      demands: [{ subjectId: "math", hours: 2 }],
    };

    const out = place(input);

    // All 2 hours placed for math.
    expect(minutesFor(out.sessions, "math")).toBe(120);
    // Nothing placed outside the single free window.
    for (const s of out.sessions) {
      expect(s.interval.start).toBeGreaterThanOrEqual(540);
      expect(s.interval.end).toBeLessThanOrEqual(660);
    }
    expect(out.unplacedHours.math ?? 0).toBe(0);
  });

  test("two subjects sharing one window are never placed on top of each other", () => {
    const out = place({
      slotMinutes: 30,
      days: [{ date: "2027-05-01", free: [{ start: 540, end: 660 }] }], // 2h
      demands: [
        { subjectId: "math", hours: 1 },
        { subjectId: "physics", hours: 1 },
      ],
    });

    expect(minutesFor(out.sessions, "math")).toBe(60);
    expect(minutesFor(out.sessions, "physics")).toBe(60);

    // No two sessions overlap.
    const sorted = [...out.sessions].sort((a, b) => a.interval.start - b.interval.start);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.interval.start).toBeGreaterThanOrEqual(sorted[i - 1]!.interval.end);
    }
  });

  test("a demand too big for one day spills onto later days", () => {
    const out = place({
      slotMinutes: 30,
      days: [
        { date: "2027-05-01", free: [{ start: 540, end: 600 }] }, // 1h
        { date: "2027-05-02", free: [{ start: 540, end: 600 }] }, // 1h
      ],
      demands: [{ subjectId: "math", hours: 2 }],
    });

    expect(minutesFor(out.sessions, "math")).toBe(120);
    expect(new Set(out.sessions.map((s) => s.date)).size).toBe(2);
    expect(out.unplacedHours.math ?? 0).toBe(0);
  });

  test("snaps sessions to the slot grid with integer-minute boundaries (no fractional sessions)", () => {
    const out = place({
      slotMinutes: 30,
      days: [{ date: "d1", free: [{ start: 540, end: 720 }] }], // 3h window
      demands: [{ subjectId: "math", hours: 1.05 }], // 63 min — not a slot multiple
    });

    for (const s of out.sessions) {
      expect(Number.isInteger(s.interval.start)).toBe(true);
      expect(Number.isInteger(s.interval.end)).toBe(true);
      expect((s.interval.end - s.interval.start) % 30).toBe(0);
    }
  });

  test("reports the shortfall when the week cannot absorb all the hours", () => {
    const out = place({
      slotMinutes: 30,
      days: [{ date: "2027-05-01", free: [{ start: 540, end: 600 }] }], // only 1h
      demands: [{ subjectId: "math", hours: 2 }],
    });

    expect(minutesFor(out.sessions, "math")).toBe(60);
    expect(out.unplacedHours.math).toBe(1); // 1 hour couldn't fit
  });
});
