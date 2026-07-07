import { describe, expect, test } from "vitest";
import { planWeek, reflow, type WeekInput } from "./week";
import type { PlacedSession } from "./placer/types";

const config = { examWindowDays: 14, maintenanceFloorFraction: 0.3 };

const minutesOn = (sessions: PlacedSession[], date: string) =>
  sessions.filter((s) => s.date === date).reduce((t, s) => t + (s.interval.end - s.interval.start), 0);
const totalMinutes = (sessions: PlacedSession[]) =>
  sessions.reduce((t, s) => t + (s.interval.end - s.interval.start), 0);

// A single subject so the whole weekly goal lands on it (allocator gives it 100%).
const oneSubject = [
  { subjectId: "math", daysToExam: null, avgConfidence: 5, performanceScore: null },
];

describe("planWeek", () => {
  test("places the weekly goal into the canvas", () => {
    const input: WeekInput = {
      slotMinutes: 30,
      weeklyGoalHours: 4,
      config,
      subjects: oneSubject,
      days: [
        // 09:00–13:00 canvas each day = 8h total canvas, goal is only 4h.
        { date: "d1", availability: [{ start: 540, end: 780 }], commitments: [], blocks: [] },
        { date: "d2", availability: [{ start: 540, end: 780 }], commitments: [], blocks: [] },
      ],
    };

    const plan = planWeek(input);

    expect(totalMinutes(plan.sessions)).toBe(240); // 4h placed
    expect(plan.unplacedHours.math ?? 0).toBe(0);
  });

  test("never schedules over a commitment", () => {
    const input: WeekInput = {
      slotMinutes: 30,
      weeklyGoalHours: 1.5,
      config,
      subjects: oneSubject,
      days: [
        {
          date: "d1",
          availability: [{ start: 540, end: 660 }], // 2h canvas
          commitments: [{ start: 600, end: 630 }], // a class 10:00–10:30
          blocks: [],
        },
      ],
    };

    const plan = planWeek(input);

    for (const s of plan.sessions) {
      const overlapsClass = s.interval.start < 630 && s.interval.end > 600;
      expect(overlapsClass).toBe(false);
    }
  });
});

describe("reflow", () => {
  test("moves hours off a newly-blocked day onto free canvas elsewhere, with no loss", () => {
    const base: WeekInput = {
      slotMinutes: 30,
      weeklyGoalHours: 4,
      config,
      subjects: oneSubject,
      days: [
        { date: "d1", availability: [{ start: 540, end: 780 }], commitments: [], blocks: [] },
        { date: "d2", availability: [{ start: 540, end: 780 }], commitments: [], blocks: [] },
      ],
    };

    // Greedy fill puts all 4h on d1, leaving d2 as slack.
    const before = planWeek(base);
    expect(minutesOn(before.sessions, "d1")).toBe(240);
    expect(minutesOn(before.sessions, "d2")).toBe(0);

    // Now the whole of d1 gets blocked (e.g. an all-day event).
    const blocked: WeekInput = {
      ...base,
      days: [
        { ...base.days[0]!, blocks: [{ start: 540, end: 780 }] },
        base.days[1]!,
      ],
    };

    const { plan, diff } = reflow(before, blocked);

    // Budget preserved — 4h still scheduled, now on d2, nothing lost.
    expect(totalMinutes(plan.sessions)).toBe(240);
    expect(minutesOn(plan.sessions, "d1")).toBe(0);
    expect(minutesOn(plan.sessions, "d2")).toBe(240);
    expect(plan.unplacedHours.math ?? 0).toBe(0);

    // The diff explains the move for the undo notification.
    expect(diff.removed.some((s) => s.date === "d1")).toBe(true);
    expect(diff.added.some((s) => s.date === "d2")).toBe(true);
  });
});
