import { describe, expect, test } from "vitest";
import {
  addCorrection,
  initialState,
  sessionKeyOf,
  setSessionStatus,
  unreviewedCorrections,
  weakestTopic,
} from "./model";

const REF = "2027-04-25";

describe("session missions + completion", () => {
  test("weakestTopic returns the lowest-confidence topic of a subject", () => {
    const s = initialState(REF);
    // math topics seeded 5,4,3 → Mechanics 1 is weakest
    expect(weakestTopic(s, "math")?.id).toBe("m1");
  });

  test("unreviewedCorrections counts only unreviewed, matching subject/topic", () => {
    let s = initialState(REF);
    expect(unreviewedCorrections(s, "math", "m1")).toBe(0);
    s = addCorrection(s, { id: "c", subjectId: "math", topicId: "m1", mistake: "x", fix: "y", date: REF, reviewed: false });
    expect(unreviewedCorrections(s, "math", "m1")).toBe(1);
    expect(unreviewedCorrections(s, "math", "p1")).toBe(0);
  });

  test("sessionKeyOf is stable for date+subject+start", () => {
    const s = { date: "2027-04-26", subjectId: "math", interval: { start: 1020, end: 1140 } };
    expect(sessionKeyOf(s)).toBe("2027-04-26|math|1020");
  });

  test("setSessionStatus toggles and clears without mutating prior state", () => {
    const s0 = initialState(REF);
    const s1 = setSessionStatus(s0, "k", "done");
    expect(s0.sessionStatus).toEqual({}); // untouched
    expect(s1.sessionStatus.k).toBe("done");
    const s2 = setSessionStatus(s1, "k", null);
    expect(s2.sessionStatus.k).toBeUndefined();
  });
});
