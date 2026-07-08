import { describe, expect, test } from "vitest";
import { reflowRemaining } from "./selfHeal";
import type { WeekInput, DayTemplate } from "../engine/week";

const day = (date: string, avail = [{ start: 1020, end: 1260 }]): DayTemplate => ({
  date, availability: avail, commitments: [], blocks: [],
});

const input = (): WeekInput => ({
  days: [day("2027-05-01"), day("2027-05-02"), day("2027-05-03")],
  subjects: [{ subjectId: "math", daysToExam: 30, avgConfidence: 4, performanceScore: null }],
  config: { examWindowDays: 14, maintenanceFloorFraction: 0.3 } as WeekInput["config"],
  weeklyGoalHours: 12,
  slotMinutes: 30,
});

describe("reflowRemaining", () => {
  test("zeroes availability on days before the reflow date, keeps today onward", () => {
    const out = reflowRemaining(input(), "2027-05-02", 0);
    expect(out.days[0]!.availability).toEqual([]); // 05-01 is past → no placement
    expect(out.days[1]!.availability).toHaveLength(1); // 05-02 kept
    expect(out.days[2]!.availability).toHaveLength(1);
  });

  test("subtracts already-banked hours from the remaining weekly goal", () => {
    const out = reflowRemaining(input(), "2027-05-02", 5);
    expect(out.weeklyGoalHours).toBe(7); // 12 - 5
  });

  test("never drives the remaining goal below zero", () => {
    const out = reflowRemaining(input(), "2027-05-02", 20);
    expect(out.weeklyGoalHours).toBe(0);
  });

  test("does not mutate the input", () => {
    const original = input();
    reflowRemaining(original, "2027-05-02", 5);
    expect(original.days[0]!.availability).toHaveLength(1);
    expect(original.weeklyGoalHours).toBe(12);
  });
});
