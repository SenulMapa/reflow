import { describe, expect, test } from "vitest";
import { addCorrection, computePlan, initialState, setTopicConfidence } from "./model";
import { effectiveConfidence } from "../data/subjects";

const REF = "2027-04-25";
const hoursFor = (p: ReturnType<typeof computePlan>, id: string) =>
  p.allocations.find((a) => a.subjectId === id)?.hours ?? 0;
const mathSubject = (s: ReturnType<typeof initialState>) =>
  s.config.subjects.find((x) => x.id === "math")!;

describe("weakness loop", () => {
  test("a subject's effective confidence is the mean of its topic confidences", () => {
    const s = initialState(REF);
    // math topics seeded at 5,4,3 -> mean 4
    expect(effectiveConfidence(mathSubject(s))).toBeCloseTo(4, 5);
  });

  test("dropping a topic's confidence pulls more subject hours", () => {
    const s = initialState(REF);
    const before = hoursFor(computePlan(s), "math");
    const weaker = setTopicConfidence(s, "math", "p1", 1);
    const after = hoursFor(computePlan(weaker), "math");
    expect(after).toBeGreaterThan(before);
  });

  test("logging a correction lowers its topic and shifts hours toward that subject", () => {
    const s = initialState(REF);
    const beforeConf = effectiveConfidence(mathSubject(s));
    const beforeHours = hoursFor(computePlan(s), "math");

    const next = addCorrection(s, {
      id: "c1",
      subjectId: "math",
      topicId: "m1",
      mistake: "forgot to resolve forces along the incline",
      fix: "resolve perpendicular + parallel, then ΣF = ma",
      date: REF,
      reviewed: false,
    });

    expect(next.corrections).toHaveLength(1);
    expect(effectiveConfidence(mathSubject(next))).toBeLessThan(beforeConf);
    expect(hoursFor(computePlan(next), "math")).toBeGreaterThan(beforeHours);
  });

  test("addCorrection does not mutate the previous state", () => {
    const s = initialState(REF);
    addCorrection(s, { id: "x", subjectId: "math", topicId: "m1", mistake: "a", fix: "b", date: REF, reviewed: false });
    expect(s.corrections).toHaveLength(0);
    expect(mathSubject(s).topics!.find((t) => t.id === "m1")!.confidence).toBe(3);
  });
});
