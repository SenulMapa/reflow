import { describe, expect, test } from "vitest";
import { addPastPaper, computePlan, initialState, subjectPerformance, type PastPaper } from "./model";

const REF = "2027-04-25";
const hoursFor = (p: ReturnType<typeof computePlan>, id: string) =>
  p.allocations.find((a) => a.subjectId === id)?.hours ?? 0;

const paper = (subjectId: string, scorePct: number | null): PastPaper => ({
  id: `${subjectId}-${scorePct}-${Math.abs(scorePct ?? 0)}`,
  subjectId,
  year: 2024,
  month: "May",
  variant: "WPH11/01",
  scorePct,
  weakChapters: [],
  date: REF,
});

describe("past-paper performance signal", () => {
  test("no scored papers → null performance (no penalty)", () => {
    expect(subjectPerformance(initialState(REF), "math")).toBe(null);
  });

  test("performance is the mean of recent scores mapped to 0..1", () => {
    let s = initialState(REF);
    s = addPastPaper(s, { ...paper("math", 80), id: "a" });
    s = addPastPaper(s, { ...paper("math", 60), id: "b" });
    expect(subjectPerformance(s, "math")).toBeCloseTo(0.7, 5);
  });

  test("a poor past-paper score pulls more hours toward that subject", () => {
    const s = initialState(REF);
    const before = hoursFor(computePlan(s), "physics");
    const after = hoursFor(
      computePlan(addPastPaper(s, { ...paper("physics", 35), id: "weak" })),
      "physics"
    );
    expect(after).toBeGreaterThan(before);
  });

  test("a strong score does not penalize (relatively fewer hours than a weak one)", () => {
    const s = initialState(REF);
    const weak = hoursFor(computePlan(addPastPaper(s, { ...paper("physics", 30), id: "w" })), "physics");
    const strong = hoursFor(computePlan(addPastPaper(s, { ...paper("physics", 95), id: "s" })), "physics");
    expect(weak).toBeGreaterThan(strong);
  });
});
