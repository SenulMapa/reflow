import { describe, expect, test } from "vitest";
import { selectNowState } from "./nowBlock";
import type { PlacedSession } from "../engine/placer/types";

const TODAY = "2027-04-27";
const YESTERDAY = "2027-04-26";

// Build a placed session on a date, start/end in minutes-of-day.
const S = (subjectId: string, start: number, end: number, date = TODAY): PlacedSession => ({
  date,
  subjectId,
  interval: { start, end },
});

const key = (s: PlacedSession) => `${s.date}|${s.subjectId}|${s.interval.start}`;

describe("selectNowState", () => {
  test("upcoming: a session later today, before its start window", () => {
    const s = S("math", 18 * 60, 19 * 60); // 18:00–19:00
    const now = selectNowState([s], {}, TODAY, 15 * 60); // 15:00
    expect(now.kind).toBe("upcoming");
    expect(now.session).toEqual(s);
    expect(now.startsInMin).toBe(180);
  });

  test("startingNow: within the ±5min window before start", () => {
    const s = S("math", 18 * 60, 19 * 60);
    const now = selectNowState([s], {}, TODAY, 18 * 60 - 3); // 17:57
    expect(now.kind).toBe("startingNow");
    expect(now.session).toEqual(s);
  });

  test("inProgress: now inside [start,end) → remaining minutes", () => {
    const s = S("math", 18 * 60, 19 * 60);
    const now = selectNowState([s], {}, TODAY, 18 * 60 + 20); // 18:20
    expect(now.kind).toBe("inProgress");
    expect(now.remainingMin).toBe(40);
  });

  test("now === start counts as inProgress (half-open interval)", () => {
    const s = S("math", 18 * 60, 19 * 60);
    const now = selectNowState([s], {}, TODAY, 18 * 60);
    expect(now.kind).toBe("inProgress");
    expect(now.remainingMin).toBe(60);
  });

  test("now === end counts as ended → missed when not done", () => {
    const s = S("math", 18 * 60, 19 * 60);
    const now = selectNowState([s], {}, TODAY, 19 * 60);
    expect(now.kind).toBe("missed");
    expect(now.session).toEqual(s);
  });

  test("missed beats inProgress by priority", () => {
    const earlier = S("math", 9 * 60, 10 * 60); // ended, not done → missed
    const current = S("physics", 11 * 60, 12 * 60); // in progress at 11:30
    const now = selectNowState([earlier, current], {}, TODAY, 11 * 60 + 30);
    expect(now.kind).toBe("missed");
    expect(now.session).toEqual(earlier);
    expect(now.missedCount).toBe(1);
  });

  test("missedCount counts all lapsed-unfinished today sessions", () => {
    const a = S("math", 9 * 60, 10 * 60);
    const b = S("physics", 10 * 60, 11 * 60);
    const now = selectNowState([a, b], {}, TODAY, 12 * 60);
    expect(now.kind).toBe("missed");
    expect(now.session).toEqual(a); // earliest surfaced
    expect(now.missedCount).toBe(2);
  });

  test("a done past session is not missed; the upcoming one shows", () => {
    const donePast = S("math", 9 * 60, 10 * 60);
    const later = S("physics", 18 * 60, 19 * 60);
    const status = { [key(donePast)]: "done" as const };
    const now = selectNowState([donePast, later], status, TODAY, 15 * 60);
    expect(now.kind).toBe("upcoming");
    expect(now.session).toEqual(later);
  });

  test("a skipped past session is not counted as missed", () => {
    const skippedPast = S("math", 9 * 60, 10 * 60);
    const later = S("physics", 18 * 60, 19 * 60);
    const status = { [key(skippedPast)]: "skipped" as const };
    const now = selectNowState([skippedPast, later], status, TODAY, 15 * 60);
    expect(now.kind).toBe("upcoming");
    expect(now.session).toEqual(later);
  });

  test("all today's sessions done → done", () => {
    const a = S("math", 9 * 60, 10 * 60);
    const b = S("physics", 11 * 60, 12 * 60);
    const status = { [key(a)]: "done" as const, [key(b)]: "done" as const };
    const now = selectNowState([a, b], status, TODAY, 20 * 60);
    expect(now.kind).toBe("done");
  });

  test("no sessions today but the week has study elsewhere → rest", () => {
    const elsewhere = S("math", 9 * 60, 10 * 60, YESTERDAY);
    const now = selectNowState([elsewhere], {}, TODAY, 12 * 60);
    expect(now.kind).toBe("rest");
  });

  test("no sessions anywhere → empty", () => {
    const now = selectNowState([], {}, TODAY, 12 * 60);
    expect(now.kind).toBe("empty");
  });

  test("sessions on other days never leak into today's selection", () => {
    const otherDay = S("math", 11 * 60, 12 * 60, YESTERDAY);
    const todayUpcoming = S("physics", 18 * 60, 19 * 60);
    const now = selectNowState([otherDay, todayUpcoming], {}, TODAY, 15 * 60);
    expect(now.kind).toBe("upcoming");
    expect(now.session).toEqual(todayUpcoming);
  });
});
