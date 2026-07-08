import { describe, expect, test } from "vitest";
import { dueReminders } from "./notify";
import type { PlacedSession } from "../engine/placer/types";

const S = (subjectId: string, start: number, end: number, date: string): PlacedSession => ({
  date, subjectId, interval: { start, end },
});
const nameOf = (id: string) => ({ math: "Mathematics", physics: "Physics" }[id] ?? id);
const at = (date: string, min: number) => Date.parse(`${date}T00:00:00`) + min * 60000;

describe("dueReminders", () => {
  test("schedules a reminder `lead` minutes before a future session start", () => {
    const s = S("physics", 18 * 60, 19 * 60, "2027-05-01"); // 18:00
    const now = at("2027-05-01", 12 * 60); // noon
    const [r] = dueReminders([s], nameOf, now, { leadMin: 10 });
    expect(r).toBeTruthy();
    expect(r!.fireAtMs).toBe(at("2027-05-01", 18 * 60 - 10)); // 17:50
    expect(r!.title).toContain("Physics");
  });

  test("excludes sessions whose reminder time has already passed", () => {
    const s = S("math", 9 * 60, 10 * 60, "2027-05-01");
    const now = at("2027-05-01", 12 * 60); // noon, past the 8:50 reminder
    expect(dueReminders([s], nameOf, now, { leadMin: 10 })).toHaveLength(0);
  });

  test("respects a horizon and sorts earliest-first", () => {
    const a = S("math", 10 * 60, 11 * 60, "2027-05-02");
    const b = S("physics", 9 * 60, 10 * 60, "2027-05-01");
    const now = at("2027-05-01", 6 * 60);
    const out = dueReminders([a, b], nameOf, now, { leadMin: 5 });
    expect(out.map((r) => r.title)).toEqual([expect.stringContaining("Physics"), expect.stringContaining("Mathematics")]);
  });
});
