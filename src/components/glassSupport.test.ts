import { describe, expect, test } from "vitest";
import { resolveGlassSupport } from "./glassSupport";

describe("resolveGlassSupport", () => {
  // The launch-crash regression: a sideloaded IPA without the linked
  // ExpoGlassEffect pod makes the probe throw. It must NOT propagate (that throw
  // at Surface's module top-level is what crashes the app at boot).
  test("returns false when the native probe throws (missing ExpoGlassEffect pod)", () => {
    const probe = () => {
      throw new Error("Cannot find native module 'ExpoGlassEffect'");
    };
    expect(resolveGlassSupport(probe)).toBe(false);
  });

  test("returns true when glass is genuinely available (iOS 26+)", () => {
    expect(resolveGlassSupport(() => true)).toBe(true);
  });

  test("returns false when glass is unavailable but the probe is well-behaved (web / Android / iOS < 26)", () => {
    expect(resolveGlassSupport(() => false)).toBe(false);
  });
});
