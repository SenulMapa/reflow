import { describe, expect, test } from "vitest";
import { freeWindows, subtractIntervals } from "./intervals";

describe("subtractIntervals", () => {
  test("a busy block in the middle splits the free window into two", () => {
    // Availability 09:00–17:00, busy lunch 12:00–13:00.
    const base = { start: 540, end: 1020 };
    const busy = [{ start: 720, end: 780 }];

    const free = subtractIntervals(base, busy);

    expect(free).toEqual([
      { start: 540, end: 720 },
      { start: 780, end: 1020 },
    ]);
  });
});

describe("freeWindows", () => {
  test("subtracts all busy intervals from every availability window", () => {
    const free = freeWindows(
      [{ start: 540, end: 1020 }],
      [
        { start: 720, end: 780 },
        { start: 900, end: 960 },
      ]
    );

    expect(free).toEqual([
      { start: 540, end: 720 },
      { start: 780, end: 900 },
      { start: 960, end: 1020 },
    ]);
  });

  test("merges overlapping availability windows so capacity is not double-counted", () => {
    const free = freeWindows(
      [
        { start: 540, end: 600 },
        { start: 570, end: 630 }, // overlaps the first
      ],
      []
    );

    expect(free).toEqual([{ start: 540, end: 630 }]);
  });
});
