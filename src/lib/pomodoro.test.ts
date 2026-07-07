import { describe, expect, test } from "vitest";
import {
  DEFAULT_POMODORO,
  fmtCountdown,
  isComplete,
  nextPhase,
  remainingMs,
} from "./pomodoro";

describe("pomodoro logic", () => {
  test("remaining counts down within the focus phase", () => {
    expect(remainingMs(DEFAULT_POMODORO, "focus", 0)).toBe(25 * 60_000);
    expect(remainingMs(DEFAULT_POMODORO, "focus", 60_000)).toBe(24 * 60_000);
  });

  test("remaining never goes negative", () => {
    expect(remainingMs(DEFAULT_POMODORO, "break", 999 * 60_000)).toBe(0);
  });

  test("a phase is complete exactly at its duration", () => {
    expect(isComplete(DEFAULT_POMODORO, "focus", 25 * 60_000 - 1)).toBe(false);
    expect(isComplete(DEFAULT_POMODORO, "focus", 25 * 60_000)).toBe(true);
  });

  test("phases alternate focus <-> break", () => {
    expect(nextPhase("focus")).toBe("break");
    expect(nextPhase("break")).toBe("focus");
  });

  test("countdown formats MM:SS", () => {
    expect(fmtCountdown(25 * 60_000)).toBe("25:00");
    expect(fmtCountdown(61_000)).toBe("01:01");
    expect(fmtCountdown(-5)).toBe("00:00");
  });
});
