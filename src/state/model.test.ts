import { describe, expect, test } from "vitest";
import {
  addBlock,
  addSubject,
  clearBlocks,
  computePlan,
  initialState,
  removeSubject,
  setConfidence,
  setWeeklyGoal,
} from "./model";

const REF = "2027-04-25";
const totalHours = (p: ReturnType<typeof computePlan>) =>
  p.sessions.reduce((t, s) => t + (s.interval.end - s.interval.start), 0) / 60;
const hoursFor = (p: ReturnType<typeof computePlan>, id: string) =>
  p.allocations.find((a) => a.subjectId === id)?.hours ?? 0;

describe("state model", () => {
  test("reducers are pure — they never mutate the previous state", () => {
    const s0 = initialState(REF);
    const s1 = setWeeklyGoal(s0, 30);
    expect(s0.config.weeklyGoalHours).toBe(24); // original untouched
    expect(s1.config.weeklyGoalHours).toBe(30);
  });

  test("raising the weekly goal schedules more total hours", () => {
    const s = initialState(REF);
    const low = totalHours(computePlan(setWeeklyGoal(s, 12)));
    const high = totalHours(computePlan(setWeeklyGoal(s, 30)));
    expect(high).toBeGreaterThan(low);
  });

  test("lowering a topic-less subject's confidence pulls more hours toward it", () => {
    // math/physics/psych carry topics (see weakness.test); a bare added subject
    // has no topics, so its own confidence still drives the allocation.
    const base = addSubject(initialState(REF), { id: "cs", name: "Computer Science", confidence: 8 });
    const before = hoursFor(computePlan(base), "cs");
    const after = hoursFor(computePlan(setConfidence(base, "cs", 1)), "cs");
    expect(after).toBeGreaterThan(before);
  });

  test("adding a one-off block moves study time off that slot", () => {
    const s = initialState(REF);
    const plan0 = computePlan(s);
    // Find the busiest day and block its first availability window fully.
    const perDay = new Map<string, number>();
    for (const ss of plan0.sessions)
      perDay.set(ss.date, (perDay.get(ss.date) ?? 0) + (ss.interval.end - ss.interval.start));
    const [busiest] = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0]!;

    const blocked = addBlock(s, busiest, { start: 0, end: 1440 }); // block whole day
    const plan1 = computePlan(blocked);
    const before = plan1.sessions.filter((x) => x.date === busiest);
    expect(before).toHaveLength(0); // nothing scheduled on a fully-blocked day
    expect(clearBlocks(blocked).week.blocks).toEqual({});
  });

  test("removing a subject drops it from the allocation", () => {
    const s = removeSubject(initialState(REF), "psych");
    const plan = computePlan(s);
    expect(plan.allocations.some((a) => a.subjectId === "psych")).toBe(false);
  });

  test("adding a subject is idempotent by id", () => {
    const s = initialState(REF);
    const once = addSubject(s, { id: "cs", name: "Computer Science", confidence: 5 });
    const twice = addSubject(once, { id: "cs", name: "Computer Science", confidence: 9 });
    expect(twice.config.subjects.filter((x) => x.id === "cs")).toHaveLength(1);
  });
});
