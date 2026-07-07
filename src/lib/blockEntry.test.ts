import { describe, expect, test } from "vitest";
import { resolveBlock } from "./blockEntry";
import type { BlockParseContext } from "./parseBlock";

const ctx: BlockParseContext = {
  weekDates: ["2027-04-26", "2027-04-27", "2027-04-28", "2027-04-29", "2027-04-30", "2027-05-01", "2027-05-02"],
  todayISO: "2027-04-28",
};

describe("resolveBlock", () => {
  test("resolves a clear phrase locally (no LLM needed)", async () => {
    const r = await resolveBlock("dinner tonight 6-8", ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe("local");
      expect(r.block).toMatchObject({ date: "2027-04-28", start: 1080, end: 1200 });
    }
  });

  test("without a configured LLM, unparseable input surfaces the local error", async () => {
    const r = await resolveBlock("busy sometime next month", ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/time/i);
  });
});
