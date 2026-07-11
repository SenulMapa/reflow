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
  "caption","mono","data","numeral","numeralLg","numeralHero","serif","heroItalic",
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

  test("type scale is complete and uses the Nothing families (IBM Plex Mono / DotGothic16 / Newsreader)", () => {
    for (const k of TYPE_KEYS) {
      expect(type[k], k).toBeDefined();
      expect((type[k] as any).fontFamily, k).toMatch(/^(IBMPlexMono|DotGothic16|Newsreader)/);
    }
    // hero numerals must be the pixel face (DotGothic16); inline data + labels are
    // Plex Mono (PostScript names — fonts embedded via the expo-font config plugin)
    expect((type.numeral as any).fontFamily).toBe("DotGothic16-Regular");
    expect((type.numeralHero as any).fontFamily).toBe("DotGothic16-Regular");
    expect((type.data as any).fontFamily).toBe("IBMPlexMono-Regular");
    expect((type.caption as any).fontFamily).toBe("IBMPlexMono-Regular");
  });

  test("subjects are monochrome (differentiate by label, not hue)", () => {
    const vals = ["Mathematics","Physics","Psychology","Computer Science"].map(s => subjectColors[s]);
    for (const v of vals) expect(v).toMatch(/^#/);
    expect(new Set(vals).size).toBe(1); // all identical → no colour coding
  });

  test("shape language: small controls ≤8, cards round to 20, pill is full", () => {
    expect(radius.sm).toBeLessThanOrEqual(8);
    expect(radius.md).toBeLessThanOrEqual(8);
    expect(radius.chip).toBe(8);
    expect(radius.card).toBe(20);
    expect(radius.pill).toBe(999);
  });

  test("spacing keeps its scale", () => {
    expect(spacing.lg).toBe(16);
  });
});
