import { describe, expect, test } from "vitest";
import { bankedMinutesBySubject, coverageOf, subjectReadiness, readinessForAll } from "./readiness";
import { initialState, addFocusSession, addPastPaper, computePlan } from "../state/model";
import type { ReflowState, PastPaper } from "../state/model";
import type { StudySubject } from "../data/subjects";
import type { SubjectAllocation } from "../engine/allocator/types";

const REF = "2027-04-26";
const WEEK = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(REF + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});

describe("bankedMinutesBySubject", () => {
  test("sums focus minutes per subject within the week", () => {
    let s = initialState(REF);
    s = addFocusSession(s, { id: "1", subjectId: "math", date: WEEK[0]!, minutes: 50 });
    s = addFocusSession(s, { id: "2", subjectId: "math", date: WEEK[2]!, minutes: 25 });
    s = addFocusSession(s, { id: "3", subjectId: "physics", date: WEEK[1]!, minutes: 40 });
    const banked = bankedMinutesBySubject(s, WEEK);
    expect(banked.math).toBe(75);
    expect(banked.physics).toBe(40);
  });

  test("excludes General (no subjectId) sessions from every subject", () => {
    let s = initialState(REF);
    s = addFocusSession(s, { id: "1", date: WEEK[0]!, minutes: 50 }); // no subjectId
    const banked = bankedMinutesBySubject(s, WEEK);
    expect(banked.math ?? 0).toBe(0);
  });

  test("excludes focus sessions outside the given week dates", () => {
    let s = initialState(REF);
    s = addFocusSession(s, { id: "1", subjectId: "math", date: "2027-01-01", minutes: 90 });
    const banked = bankedMinutesBySubject(s, WEEK);
    expect(banked.math ?? 0).toBe(0);
  });
});

describe("coverageOf", () => {
  const withTopics = (confs: number[]): StudySubject => ({
    id: "x",
    name: "X",
    confidence: 5,
    topics: confs.map((c, i) => ({ id: `t${i}`, name: `T${i}`, confidence: c })),
  });

  test("fraction of topics at or above the confident threshold (default 6/10)", () => {
    // confidences 7,6,3 → two are >=6 → 2/3
    expect(coverageOf(withTopics([7, 6, 3]))).toBeCloseTo(2 / 3, 5);
  });

  test("all topics below threshold → 0", () => {
    expect(coverageOf(withTopics([2, 3, 4]))).toBe(0);
  });

  test("no topics → falls back to the subject's own confidence vs threshold", () => {
    expect(coverageOf({ id: "x", name: "X", confidence: 7 })).toBe(1);
    expect(coverageOf({ id: "x", name: "X", confidence: 4 })).toBe(0);
  });

  test("threshold is configurable", () => {
    expect(coverageOf(withTopics([5, 5, 5]), 5)).toBe(1); // all >=5
  });
});

// ── readiness aggregator ────────────────────────────────────────────────────

const paper = (subjectId: string, scorePct: number | null, id: string): PastPaper => ({
  id,
  subjectId,
  year: 2027,
  month: "May",
  variant: "U1",
  scorePct,
  weakChapters: [],
  date: "2027-04-20",
});

// A state with one fully-controlled subject "phys": topics all confident (cov=1).
function stateWith(opts: { papers?: number[]; bankedMin?: number }): ReflowState {
  let s = initialState(REF);
  s = {
    ...s,
    config: {
      ...s.config,
      subjects: [
        {
          id: "phys",
          name: "Physics",
          confidence: 6,
          topics: [
            { id: "a", name: "A", confidence: 8 },
            { id: "b", name: "B", confidence: 7 },
          ],
        },
      ],
    },
  };
  // addPastPaper prepends (newest-first): push in chronological order so the last
  // pushed is newest — mirrors the app.
  for (let i = 0; i < (opts.papers?.length ?? 0); i++) {
    s = addPastPaper(s, paper("phys", opts.papers![i]!, `p${i}`));
  }
  if (opts.bankedMin) {
    s = addFocusSession(s, { id: "f", subjectId: "phys", date: WEEK[0]!, minutes: opts.bankedMin });
  }
  return s;
}

const ALLOC: SubjectAllocation[] = [{ subjectId: "phys", hours: 6, rationale: "test" }];

describe("subjectReadiness", () => {
  test("no papers → not enough signal: enough=false, readiness=null, thin, no trend", () => {
    const r = subjectReadiness(stateWith({}), "phys", ALLOC, WEEK);
    expect(r.enough).toBe(false);
    expect(r.readiness).toBeNull();
    expect(r.dataStrength).toBe("thin");
    expect(r.trend).toBeNull();
    expect(r.papers).toBe(0);
  });

  test("one paper → a number from the full formula", () => {
    // perf=0.6, cov=1, banked 180min=3h / 6h alloc → pace=0.5
    const r = subjectReadiness(stateWith({ papers: [60], bankedMin: 180 }), "phys", ALLOC, WEEK);
    expect(r.enough).toBe(true);
    expect(r.performance).toBeCloseTo(0.6, 5);
    expect(r.coverage).toBe(1);
    expect(r.pace).toBeCloseTo(0.5, 5);
    // 0.40*0.6 + 0.35*1 + 0.25*0.5 = 0.715
    expect(r.readiness).toBeCloseTo(0.715, 5);
    expect(r.dataStrength).toBe("ok");
  });

  test("pace caps at 1 when banked exceeds allocated", () => {
    const r = subjectReadiness(stateWith({ papers: [50], bankedMin: 600 }), "phys", ALLOC, WEEK);
    expect(r.pace).toBe(1);
  });

  test("trend rises when recent scores climb", () => {
    // pushed 50 then 80 → newest is 80 → upward
    const r = subjectReadiness(stateWith({ papers: [50, 80] }), "phys", ALLOC, WEEK);
    expect(r.trend).toBe(1);
  });

  test("trend falls when recent scores drop", () => {
    const r = subjectReadiness(stateWith({ papers: [80, 50] }), "phys", ALLOC, WEEK);
    expect(r.trend).toBe(-1);
  });

  test("dataStrength is solid at 3+ papers", () => {
    const r = subjectReadiness(stateWith({ papers: [50, 60, 70] }), "phys", ALLOC, WEEK);
    expect(r.dataStrength).toBe("solid");
  });

  test("carries auditable receipt fields", () => {
    const r = subjectReadiness(stateWith({ papers: [60], bankedMin: 120 }), "phys", ALLOC, WEEK);
    expect(r.papers).toBe(1);
    expect(r.bankedHours).toBeCloseTo(2, 5);
    expect(r.allocatedHours).toBe(6);
    expect(r.confidentTopics).toBe(2);
    expect(r.totalTopics).toBe(2);
  });
});

describe("readinessForAll", () => {
  test("returns one entry per configured subject", () => {
    const s = stateWith({ papers: [60] });
    const plan = computePlan(s);
    const all = readinessForAll(s, plan, WEEK);
    expect(all).toHaveLength(1);
    expect(all[0]!.subjectId).toBe("phys");
  });
});
