import { describe, expect, test } from "vitest";
import { allocate } from "./allocator";
import type { AllocatorConfig, SubjectSignals } from "./types";

const config: AllocatorConfig = {
  examWindowDays: 14,
  maintenanceFloorFraction: 0.3,
};

function subject(overrides: Partial<SubjectSignals>): SubjectSignals {
  return {
    subjectId: "x",
    daysToExam: null,
    avgConfidence: 5,
    performanceScore: null,
    ...overrides,
  };
}

const sumHours = (out: { allocations: { hours: number }[] }) =>
  out.allocations.reduce((t, a) => t + a.hours, 0);

describe("allocate", () => {
  test("distributes exactly the week's total available hours", () => {
    const out = allocate({
      totalAvailableHours: 20,
      config,
      subjects: [
        subject({ subjectId: "math" }),
        subject({ subjectId: "physics" }),
        subject({ subjectId: "cs" }),
        subject({ subjectId: "psych" }),
      ],
    });

    expect(sumHours(out)).toBeCloseTo(20, 5);
    expect(out.allocations).toHaveLength(4);
  });

  test("a pinned subject gets exactly its pinned hours; the rest share the remainder", () => {
    const out = allocate({
      totalAvailableHours: 20,
      config,
      subjects: [
        subject({ subjectId: "math", pinnedHours: 8 }),
        subject({ subjectId: "physics" }),
        subject({ subjectId: "cs" }),
      ],
    });

    const math = out.allocations.find((a) => a.subjectId === "math");
    expect(math?.hours).toBe(8);
    expect(sumHours(out)).toBeCloseTo(20, 5);
  });

  // ── THE SPEC FOR YOUR WEIGHTING FUNCTION (currently RED on purpose) ──
  // Two equally-weak subjects; one has an exam in 3 days, the other has none.
  // A good heuristic gives the imminent-exam subject strictly more time.
  test("a nearer exam earns a subject strictly more hours than an equal subject with no exam", () => {
    const out = allocate({
      totalAvailableHours: 20,
      config,
      subjects: [
        subject({ subjectId: "examSoon", daysToExam: 3, avgConfidence: 5 }),
        subject({ subjectId: "noExam", daysToExam: null, avgConfidence: 5 }),
      ],
    });

    const examSoon = out.allocations.find((a) => a.subjectId === "examSoon")!;
    const noExam = out.allocations.find((a) => a.subjectId === "noExam")!;
    expect(examSoon.hours).toBeGreaterThan(noExam.hours);
  });

  test("urgency peaks at the exam: an exam today outweighs one tomorrow", () => {
    const out = allocate({
      totalAvailableHours: 20,
      config,
      subjects: [
        subject({ subjectId: "today", daysToExam: 0, avgConfidence: 5 }),
        subject({ subjectId: "tomorrow", daysToExam: 1, avgConfidence: 5 }),
      ],
    });

    const today = out.allocations.find((a) => a.subjectId === "today")!;
    const tomorrow = out.allocations.find((a) => a.subjectId === "tomorrow")!;
    expect(today.hours).toBeGreaterThanOrEqual(tomorrow.hours);
  });
});
