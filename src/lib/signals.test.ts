import { describe, expect, test } from "vitest";
import { nudgeConfidence } from "./signals";

describe("nudgeConfidence", () => {
  test("moves current confidence toward the observed score (EMA)", () => {
    // 0.6*4 + 0.4*9 = 2.4 + 3.6 = 6 → rounds to 6
    expect(nudgeConfidence(4, 9)).toBe(6);
  });

  test("a low score pulls confidence down, not to zero", () => {
    // 0.6*8 + 0.4*2 = 4.8 + 0.8 = 5.6 → 6
    expect(nudgeConfidence(8, 2)).toBe(6);
  });

  test("clamps to the 1..10 range", () => {
    expect(nudgeConfidence(10, 10)).toBe(10);
    expect(nudgeConfidence(1, 0)).toBe(1);
  });

  test("is gentle — a single signal never fully overwrites the prior", () => {
    // one perfect score on a weak topic shouldn't jump it to 10
    expect(nudgeConfidence(3, 10)).toBeLessThan(8);
  });

  test("weight is configurable", () => {
    // full weight = adopt the score outright
    expect(nudgeConfidence(3, 9, 1)).toBe(9);
  });
});
