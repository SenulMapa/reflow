import { describe, expect, test } from "vitest";
import { ringMetrics, examMarkerAngleDeg, pointOnCircle, ridgePath } from "./geometry";

describe("ringMetrics", () => {
  test("undefined coverage leaves the ring empty (offset == circumference)", () => {
    const r = 32, m = ringMetrics(undefined, r);
    expect(m.circumference).toBeCloseTo(2 * Math.PI * r, 6);
    expect(m.dashOffset).toBeCloseTo(m.circumference, 6);
  });
  test("full coverage closes the ring (offset 0)", () => {
    expect(ringMetrics(1, 32).dashOffset).toBeCloseTo(0, 6);
  });
  test("half coverage offsets half the circumference", () => {
    const m = ringMetrics(0.5, 32);
    expect(m.dashOffset).toBeCloseTo(m.circumference / 2, 6);
  });
  test("out-of-range coverage clamps", () => {
    expect(ringMetrics(2, 32).dashOffset).toBeCloseTo(0, 6);
    expect(ringMetrics(-1, 32).dashOffset).toBeCloseTo(ringMetrics(0, 32).circumference, 6);
  });
});

describe("examMarkerAngleDeg", () => {
  test("no exam ⇒ null", () => {
    expect(examMarkerAngleDeg(null)).toBeNull();
  });
  test("exam today sits furthest round (frac 1 ⇒ 270°)", () => {
    expect(examMarkerAngleDeg(0)).toBeCloseTo(270, 6);
  });
  test("exam a full window away sits at the top (-90°)", () => {
    expect(examMarkerAngleDeg(365, 365)).toBeCloseTo(-90, 6);
  });
  test("nearer exam ⇒ larger angle than farther exam", () => {
    expect(examMarkerAngleDeg(30)!).toBeGreaterThan(examMarkerAngleDeg(300)!);
  });
});

describe("pointOnCircle", () => {
  test("-90° is straight up from centre", () => {
    const p = pointOnCircle(39, 39, 36, -90);
    expect(p.x).toBeCloseTo(39, 6);
    expect(p.y).toBeCloseTo(3, 6);
  });
});

describe("ridgePath", () => {
  test("first and last points span the padded width at the data extremes", () => {
    const { points } = ridgePath([10, 0, 20], 100, 40, 4);
    expect(points).toHaveLength(3);
    expect(points[0]!.x).toBeCloseTo(4, 6);
    expect(points[2]!.x).toBeCloseTo(96, 6);
    // max value (20) sits at the top padding; min (0) at the bottom baseline
    expect(points[2]!.y).toBeCloseTo(4, 6);
    expect(points[1]!.y).toBeCloseTo(36, 6);
  });
  test("line starts with a moveTo and area closes back to the baseline", () => {
    const { line, area } = ridgePath([1, 2], 100, 40, 4);
    expect(line.startsWith("M")).toBe(true);
    expect(area.trimEnd().endsWith("Z")).toBe(true);
  });
  test("a single value is handled without NaN", () => {
    const { points } = ridgePath([5], 100, 40, 4);
    expect(points).toHaveLength(1);
    expect(Number.isNaN(points[0]!.x)).toBe(false);
  });
});
