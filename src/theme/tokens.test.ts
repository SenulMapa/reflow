import { describe, expect, test } from "vitest";
import { palette, type, subjectColors, spacing, radius } from "./tokens";

const COLOR_KEYS = [
  "bg","surface","separator","text","textDim","textFaint",
  "accent","accentSoft","gold","goldSoft","danger","success","warning",
] as const;
const TYPE_KEYS = [
  "hero","heroItalic","largeTitle","title","serif",
  "headline","body","callout","footnote","caption","data",
] as const;

describe("Orbit tokens", () => {
  test("both themes expose every colour key", () => {
    for (const scheme of ["light","dark"] as const)
      for (const k of COLOR_KEYS)
        expect(palette[scheme][k], `${scheme}.${k}`).toMatch(/^#|rgba?\(/);
  });
  test("light and dark accents differ (system-adaptive, not inverted)", () => {
    expect(palette.light.accent).not.toBe(palette.dark.accent);
  });
  test("type scale is complete and SF-based (no Fraunces family)", () => {
    for (const k of TYPE_KEYS) {
      expect(type[k], k).toBeDefined();
      expect((type[k] as any).fontFamily ?? undefined).toBeUndefined();
    }
  });
  test("subject colours cover all four subjects", () => {
    for (const s of ["Mathematics","Physics","Psychology","Computer Science"])
      expect(subjectColors[s]).toMatch(/^#/);
  });
  test("spacing and radius keep their scale", () => {
    expect(spacing.lg).toBe(16);
    expect(radius.pill).toBe(999);
  });
});
