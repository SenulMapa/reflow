import { describe, expect, test } from "vitest";
import { palette, type, subjectColors, spacing, radius } from "./tokens";

const COLOR_KEYS = [
  // legacy keys (remapped onto Nothing greyscale) — still present for consumers
  "bg","surface","separator","text","textDim","textFaint",
  "accent","accentSoft","gold","goldSoft","danger","success","warning",
  // native Nothing keys
  "display","raised","line2","accentText","dotbg",
] as const;
const TYPE_KEYS = [
  "hero","largeTitle","title","headline","body","callout","footnote",
  "caption","mono","data","numeral","numeralLg","serif","heroItalic",
] as const;

describe("Nothing tokens", () => {
  test("both themes expose every colour key", () => {
    for (const scheme of ["light","dark"] as const)
      for (const k of COLOR_KEYS)
        expect(palette[scheme][k], `${scheme}.${k}`).toMatch(/^#|rgba?\(/);
  });

  test("the signal-red accent holds identically on both themes (Nothing red)", () => {
    expect(palette.light.accent).toBe("#D71921");
    expect(palette.dark.accent).toBe("#D71921");
  });

  test("accent FOREGROUND is theme-tuned for contrast (brightened dark / darkened light)", () => {
    expect(palette.light.accentText).not.toBe(palette.dark.accentText);
  });

  test("greyscale inverts between themes (display + canvas flip)", () => {
    expect(palette.dark.display).toBe("#FFFFFF");
    expect(palette.light.display).toBe("#000000");
    expect(palette.dark.bg).toBe("#000000");
  });

  test("type scale is complete and uses the Nothing families (Doto / Geist / Newsreader)", () => {
    for (const k of TYPE_KEYS) {
      expect(type[k], k).toBeDefined();
      expect((type[k] as any).fontFamily, k).toMatch(/^(Doto|Geist|Newsreader)/);
    }
    // standalone numbers must be Doto (dot-matrix); labels must be mono
    // (PostScript names — fonts are embedded via the expo-font config plugin)
    expect((type.data as any).fontFamily).toBe("Doto-Regular");
    expect((type.numeral as any).fontFamily).toBe("Doto-Regular");
    expect((type.caption as any).fontFamily).toBe("GeistMono-Regular");
  });

  test("subjects are monochrome (differentiate by label, not hue)", () => {
    const vals = ["Mathematics","Physics","Psychology","Computer Science"].map(s => subjectColors[s]);
    for (const v of vals) expect(v).toMatch(/^#/);
    expect(new Set(vals).size).toBe(1); // all identical → no colour coding
  });

  test("radius is capped at 8 (Nothing caps cards at 8px)", () => {
    for (const r of [radius.sm, radius.md, radius.lg, radius.xl])
      expect(r).toBeLessThanOrEqual(8);
    expect(radius.pill).toBe(999);
  });

  test("spacing keeps its scale", () => {
    expect(spacing.lg).toBe(16);
  });
});
