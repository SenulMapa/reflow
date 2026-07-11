import { describe, expect, test } from "vitest";
import { review, newCardState, isDue, isLeech, DEFAULT_EASE, MIN_EASE } from "./sm2";

describe("SM-2 engine", () => {
  test("a new card is due today with default ease", () => {
    const c = newCardState("2026-07-11");
    expect(c.dueAt).toBe("2026-07-11");
    expect(c.easeFactor).toBe(DEFAULT_EASE);
    expect(isDue(c, "2026-07-11")).toBe(true);
  });

  test("the classic interval ladder is 1 → 6 → round(prev × EF)", () => {
    let c = newCardState("2026-07-11");
    c = review(c, 5, "2026-07-11");
    expect(c.repetitions).toBe(1);
    expect(c.interval).toBe(1);
    expect(c.dueAt).toBe("2026-07-12");

    c = review(c, 5, "2026-07-12");
    expect(c.repetitions).toBe(2);
    expect(c.interval).toBe(6);
    expect(c.dueAt).toBe("2026-07-18");

    c = review(c, 5, "2026-07-18");
    expect(c.repetitions).toBe(3);
    // interval = round(6 × EF), EF grew above 2.5 on q=5 reviews
    expect(c.interval).toBe(Math.round(6 * c.easeFactor));
    expect(c.interval).toBeGreaterThan(6);
  });

  test("a lapse (q<3) resets reps and schedules tomorrow", () => {
    let c = newCardState("2026-07-11");
    c = review(c, 5, "2026-07-11");
    c = review(c, 5, "2026-07-12"); // interval now 6
    c = review(c, 1, "2026-07-18"); // blackout
    expect(c.repetitions).toBe(0);
    expect(c.interval).toBe(1);
    expect(c.dueAt).toBe("2026-07-19");
  });

  test("ease factor drops on hard recalls but never below 1.3", () => {
    let c = newCardState("2026-07-11");
    for (let i = 0; i < 20; i++) c = review(c, 0, `2026-07-${String(11 + (i % 15)).padStart(2, "0")}`);
    expect(c.easeFactor).toBeGreaterThanOrEqual(MIN_EASE);
    expect(c.easeFactor).toBeCloseTo(MIN_EASE, 2);
  });

  test("ease factor rises on perfect recalls", () => {
    let c = newCardState("2026-07-11");
    c = review(c, 5, "2026-07-11");
    expect(c.easeFactor).toBeGreaterThan(DEFAULT_EASE);
  });

  test("quality is clamped to 0–5", () => {
    const c = newCardState("2026-07-11");
    expect(() => review(c, 9, "2026-07-11")).not.toThrow();
    expect(review(c, 9, "2026-07-11").repetitions).toBe(1); // treated as 5 (pass)
    expect(review(c, -3, "2026-07-11").repetitions).toBe(0); // treated as 0 (lapse)
  });

  test("a repeatedly-lapsing reviewed card is a leech", () => {
    let c = newCardState("2026-07-11");
    for (let i = 0; i < 12; i++) c = review(c, 1, `2026-08-${String(1 + i).padStart(2, "0")}`);
    expect(isLeech(c)).toBe(true);
  });

  test("purity: input state is not mutated", () => {
    const c = newCardState("2026-07-11");
    const snapshot = JSON.stringify(c);
    review(c, 4, "2026-07-11");
    expect(JSON.stringify(c)).toBe(snapshot);
  });
});
