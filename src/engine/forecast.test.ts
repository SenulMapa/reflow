import { describe, expect, test } from "vitest";
import { forecastSubject } from "./forecast";

describe("grade forecast", () => {
  test("no papers → honest 'none', no fabricated grade", () => {
    const f = forecastSubject([], "2027-06-01");
    expect(f.dataStrength).toBe("none");
    expect(f.current).toBeNull();
    expect(f.projected).toBeNull();
  });

  test("one paper → reports current but refuses to project (thin)", () => {
    const f = forecastSubject([{ scorePct: 62, date: "2026-07-01" }], "2027-06-01");
    expect(f.current).toBe(62);
    expect(f.projected).toBeNull();
    expect(f.dataStrength).toBe("thin");
  });

  test("an improving run projects upward and reads trend 'up'", () => {
    const f = forecastSubject(
      [
        { scorePct: 50, date: "2026-06-01" },
        { scorePct: 60, date: "2026-06-15" },
        { scorePct: 70, date: "2026-07-01" },
      ],
      "2026-08-01",
    );
    expect(f.current).toBe(70);
    expect(f.trend).toBe("up");
    expect(f.slopePerWeek!).toBeGreaterThan(0);
    expect(f.projected!).toBeGreaterThan(70);
    expect(f.dataStrength).toBe("ok");
  });

  test("a declining run reads trend 'down'", () => {
    const f = forecastSubject(
      [
        { scorePct: 80, date: "2026-06-01" },
        { scorePct: 70, date: "2026-06-15" },
        { scorePct: 62, date: "2026-07-01" },
      ],
      "2026-08-01",
    );
    expect(f.trend).toBe("down");
    expect(f.slopePerWeek!).toBeLessThan(0);
  });

  test("projection is clamped to 0..100", () => {
    const f = forecastSubject(
      [
        { scorePct: 88, date: "2026-06-01" },
        { scorePct: 94, date: "2026-06-15" },
        { scorePct: 99, date: "2026-07-01" },
      ],
      "2027-06-01",
    );
    expect(f.projected!).toBeLessThanOrEqual(100);
    expect(f.projected!).toBeGreaterThanOrEqual(0);
  });

  test("flat scores read 'flat'", () => {
    const f = forecastSubject(
      [
        { scorePct: 65, date: "2026-06-01" },
        { scorePct: 65, date: "2026-06-15" },
        { scorePct: 65, date: "2026-07-01" },
      ],
      "2026-08-01",
    );
    expect(f.trend).toBe("flat");
  });
});
