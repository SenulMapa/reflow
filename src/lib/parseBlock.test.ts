import { describe, expect, test } from "vitest";
import { parseBlock, type BlockParseContext } from "./parseBlock";

// Week: Mon 2027-04-26 .. Sun 2027-05-02, today = Wed 2027-04-28.
const ctx: BlockParseContext = {
  weekDates: [
    "2027-04-26", "2027-04-27", "2027-04-28", "2027-04-29",
    "2027-04-30", "2027-05-01", "2027-05-02",
  ],
  todayISO: "2027-04-28",
};

const parse = (t: string) => parseBlock(t, ctx);

describe("parseBlock", () => {
  test("“dinner tonight 6-8” → today evening, PM inferred, reason captured", () => {
    const r = parse("dinner tonight 6-8");
    expect(r).toEqual({
      ok: true,
      block: { date: "2027-04-28", start: 1080, end: 1200, reason: "dinner" },
    });
  });

  test("“blocked friday 5pm to 7pm dentist” resolves the weekday + explicit PM", () => {
    const r = parse("blocked friday 5pm to 7pm dentist");
    expect(r).toEqual({
      ok: true,
      block: { date: "2027-04-30", start: 1020, end: 1140, reason: "dentist" },
    });
  });

  test("“tomorrow 9-11am” → next day, AM propagated, no reason", () => {
    expect(parse("tomorrow 9-11am")).toEqual({
      ok: true,
      block: { date: "2027-04-29", start: 540, end: 660 },
    });
  });

  test("24h times are taken literally", () => {
    expect(parse("can't study wednesday 18:00-20:00")).toEqual({
      ok: true,
      block: { date: "2027-04-28", start: 1080, end: 1200 },
    });
  });

  test("bare “1-3” defaults to the afternoon (PM)", () => {
    const r = parse("gym 1-3");
    expect(r.ok && r.block.start).toBe(780);
    expect(r.ok && r.block.end).toBe(900);
  });

  test("a daypart word with no explicit time uses its default range", () => {
    expect(parse("monday morning")).toEqual({
      ok: true,
      block: { date: "2027-04-26", start: 540, end: 720 },
    });
  });

  test("no time and no daypart → a helpful failure, not a guess", () => {
    const r = parse("busy sometime next month");
    expect(r.ok).toBe(false);
  });
});
