import { describe, expect, test } from "vitest";
import { buildWeekInput, DEFAULT_AVAILABILITY, daysToNearestExam } from "./buildWeek";
import { DEMO_SUBJECTS } from "../data/subjects";
import { planWeek, reflow } from "../engine/week";

const REF = "2027-04-25";

describe("demo data path (what the This Week screen renders)", () => {
  test("computes days to each subject's nearest upcoming unit exam", () => {
    expect(daysToNearestExam("psych", REF)).toBe(9); // WPS01 on 2027-05-04
    expect(daysToNearestExam("math", REF)).toBe(11); // WMA11 on 2027-05-06
    expect(daysToNearestExam("physics", REF)).toBe(12); // WPH11 on 2027-05-07
    expect(daysToNearestExam("math", "2027-06-01")).toBe(null); // all past
  });

  test("planWeek yields a full 7-day plan that respects the weekly goal", () => {
    const input = buildWeekInput({
      refDateISO: REF,
      subjects: DEMO_SUBJECTS,
      availability: DEFAULT_AVAILABILITY,
      weeklyGoalHours: 24,
    });
    const plan = planWeek(input);

    expect(input.days).toHaveLength(7);
    // Allocations distribute the whole goal across the 3 subjects.
    const allocated = plan.allocations.reduce((t, a) => t + a.hours, 0);
    expect(allocated).toBeCloseTo(24, 5);
    // With 34h of canvas and a 24h goal, everything fits (no shortfall).
    const unplaced = Object.values(plan.unplacedHours).reduce((t, h) => t + h, 0);
    expect(unplaced).toBe(0);
    // Every session sits on the 30-min grid.
    for (const s of plan.sessions) {
      expect((s.interval.end - s.interval.start) % 30).toBe(0);
    }
  });

  test("blocking the busiest day reflows hours elsewhere and reports the move", () => {
    const input = buildWeekInput({
      refDateISO: REF,
      subjects: DEMO_SUBJECTS,
      availability: DEFAULT_AVAILABILITY,
      weeklyGoalHours: 24,
    });
    const before = planWeek(input);

    // Block a 2h chunk on the first day that has study time.
    const perDay = new Map<string, number>();
    for (const s of before.sessions)
      perDay.set(s.date, (perDay.get(s.date) ?? 0) + (s.interval.end - s.interval.start));
    const busiest = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    const idx = input.days.findIndex((d) => d.date === busiest);
    const win = input.days[idx]!.availability[0]!;

    const blocked = {
      ...input,
      days: input.days.map((d, i) =>
        i === idx ? { ...d, blocks: [{ start: win.start, end: win.start + 120 }] } : d
      ),
    };
    const { plan, diff } = reflow(before, blocked);

    // Something moved, and the diff explains it (drives the undo notification).
    expect(diff.removed.length + diff.added.length).toBeGreaterThan(0);
    // No session lands inside the blocked interval on that day.
    for (const s of plan.sessions.filter((s) => s.date === busiest)) {
      const inBlock = s.interval.start < win.start + 120 && s.interval.end > win.start;
      expect(inBlock).toBe(false);
    }
  });
});
