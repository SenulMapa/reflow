import { describe, expect, test } from "vitest";
import { addFocusSession, focusMinutesOn, initialState } from "./model";

const REF = "2027-04-25";

describe("focus sessions", () => {
  test("logging sessions accumulates focused minutes per day", () => {
    let s = initialState(REF);
    s = addFocusSession(s, { id: "1", subjectId: "math", date: "2027-04-25", minutes: 25 });
    s = addFocusSession(s, { id: "2", subjectId: "physics", date: "2027-04-25", minutes: 25 });
    s = addFocusSession(s, { id: "3", subjectId: "math", date: "2027-04-26", minutes: 25 });

    expect(focusMinutesOn(s, "2027-04-25")).toBe(50);
    expect(focusMinutesOn(s, "2027-04-26")).toBe(25);
    expect(focusMinutesOn(s, "2027-04-27")).toBe(0);
  });

  test("addFocusSession does not mutate the previous state", () => {
    const s = initialState(REF);
    addFocusSession(s, { id: "x", date: REF, minutes: 25 });
    expect(s.focusSessions).toHaveLength(0);
  });
});
