import type { TextStyle } from "react-native";

/**
 * "Nothing" identity — monochrome, dot-first, industrial. Black / grey / white
 * do all the work; the single signal-red (#D71921) lights up ONLY for genuine
 * signals (needs-input, over-limit, live, overdue). Dark-first but fully
 * light+dark adaptive. Every legacy token key from the previous "Orbit" identity
 * is preserved (so the whole app re-skins from this one file without touching
 * 30+ consumers), remapped onto the Nothing greyscale — plus the native Nothing
 * keys (`display`, `raised`, `line2`, `dotbg`, `accentText`) that new components use.
 *
 * Source of truth: vibe-nothing-ui-design/css/tokens.css + DESIGN.md.
 */
export const palette = {
  light: {
    // ── legacy keys (remapped) ──────────────────────────────────────────────
    bg: "#F2F2F2",            // warm-grey paper canvas
    surface: "#FFFFFF",       // card / panel base
    separator: "#E2E2E2",     // hairline divider (= line)
    text: "#1C1C1C",          // body text (= primary)
    textDim: "#585A5A",       // labels / secondary (= secondary)
    textFaint: "#9A9A9A",     // faintest text / ticks (= muted)
    accent: "#D71921",        // SIGNAL red — fills only, scarce
    accentSoft: "#EDEDED",    // neutral raised (active states invert, never red)
    gold: "#9C6B00",          // rewards = amber data-state (on values only)
    goldSoft: "rgba(156,107,0,0.14)",
    danger: "#D23B30",        // error (same red family)
    success: "#3D8B4A",
    warning: "#9C6B00",
    // ── native Nothing keys ─────────────────────────────────────────────────
    display: "#000000",       // headings / hero / inversion fill
    raised: "#EDEDED",        // secondary lift, active rows
    line2: "#CFCFCF",         // visible borders / outlines
    accentText: "#C2141C",    // accent as FOREGROUND (text/border/icon), darkened for contrast
    dotbg: "rgba(0,0,0,0.42)",// background dot field
  },
  dark: {
    // ── legacy keys (remapped) ──────────────────────────────────────────────
    bg: "#000000",            // OLED black canvas
    surface: "#0C0C0C",       // card / panel base
    separator: "#262626",     // hairline divider (= line)
    text: "#EDEDED",          // body text (= primary)
    textDim: "#8C8C8C",       // labels / secondary (= secondary)
    textFaint: "#5A5A5A",     // faintest text / ticks (= muted)
    accent: "#D71921",        // SIGNAL red — fills only, scarce
    accentSoft: "#171717",    // neutral raised (active states invert, never red)
    gold: "#F2C94C",          // rewards = amber data-state (on values only)
    goldSoft: "rgba(242,201,76,0.14)",
    danger: "#FF5247",        // error (same red family)
    success: "#7BE38A",
    warning: "#F2C94C",
    // ── native Nothing keys ─────────────────────────────────────────────────
    display: "#FFFFFF",       // headings / hero / inversion fill
    raised: "#171717",        // secondary lift, active rows
    line2: "#3A3A3A",         // visible borders / outlines
    accentText: "#FF4438",    // accent as FOREGROUND, brightened for contrast
    dotbg: "rgba(255,255,255,0.42)",
  },
} as const;

export type Palette = Record<keyof (typeof palette)["light"], string>;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
/** Nothing caps radius hard: controls 6px, cards 8px — nothing larger. Legacy
 *  `lg`/`xl` keys are kept but clamped to 8 so old call-sites can't exceed it. */
export const radius = { sm: 6, md: 8, lg: 8, xl: 8, pill: 999 } as const;

/** iPad/large-screen: cap the content column and centre it so the reading
 *  measure stays comfortable instead of stretching edge-to-edge. */
export const CONTENT_MAX_WIDTH = 600;
export const bounded = { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" } as const;

/**
 * Nothing type system — five roles, each with a job. Families are registered in
 * `app/_layout.tsx` via `useFonts` (SIL OFL 1.1, bundled). RN ignores `fontWeight`
 * with a specific-weight family, so weight lives in the family name.
 *
 *  • Doto        — dot-matrix display: every standalone number / % / clock
 *  • Geist       — UI / body copy
 *  • GeistSemiBold — headings, card/dialog titles
 *  • GeistMono   — labels (uppercase, tracked), data rows, timestamps
 *  • NewsreaderItalic — page-level editorial accent ONLY (never inside components)
 */
export const fonts = {
  doto: "Doto",
  ui: "Geist",
  uiSemi: "GeistSemiBold",
  mono: "GeistMono",
  monoMed: "GeistMonoMedium",
  editorial: "NewsreaderItalic",
  // legacy aliases (kept so existing `fonts.*` refs & type roles resolve)
  display: "GeistSemiBold",
  displayItalic: "NewsreaderItalic",
  light: "Geist",
  lightItalic: "NewsreaderItalic",
} as const;

const t = (
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  extra: Partial<TextStyle> = {},
): TextStyle => ({ fontFamily, fontSize, lineHeight, ...extra });

export const type = {
  // headings & display — Geist SemiBold (Nothing headings are sans, not serif)
  hero:       t(fonts.uiSemi, 40, 44, { letterSpacing: -1 }),
  largeTitle: t(fonts.uiSemi, 32, 38, { letterSpacing: -0.6 }),
  title:      t(fonts.uiSemi, 24, 30, { letterSpacing: -0.4 }),
  headline:   t(fonts.uiSemi, 17, 22, { letterSpacing: -0.2 }),
  // body — Geist
  body:       t(fonts.ui, 16, 24),
  callout:    t(fonts.ui, 15, 21),
  footnote:   t(fonts.ui, 13.5, 19),
  // labels / data — Geist Mono (uppercase, tracked)
  caption:    t(fonts.mono, 11, 14, { letterSpacing: 1.2, textTransform: "uppercase" }),
  mono:       t(fonts.mono, 13, 18, { letterSpacing: 0.3 }),
  data:       t(fonts.doto, 17, 21, { fontVariant: ["tabular-nums"] }),
  // dot-matrix numerals — Doto (standalone numbers / % / clocks)
  numeral:    t(fonts.doto, 40, 44, { letterSpacing: 1 }),
  numeralLg:  t(fonts.doto, 64, 66, { letterSpacing: 1 }),
  // editorial accent — Newsreader Italic, page-level only
  serif:      t(fonts.editorial, 22, 30, { fontStyle: "italic" }),
  heroItalic: t(fonts.editorial, 34, 40, { fontStyle: "italic" }),
} as const;

/**
 * Subjects differentiate by Geist Mono LABEL, not hue (Nothing kills multicolor).
 * Kept as a map (14 call-sites index it) but every subject resolves to the same
 * muted grey, so any residual colour usage reads monochrome until per-screen
 * cleanup routes it through the label instead.
 */
const SUBJECT_MONO = "#8C8C8C";
export const subjectColors: Record<string, string> = {
  Mathematics: SUBJECT_MONO,
  Physics: SUBJECT_MONO,
  Psychology: SUBJECT_MONO,
  "Computer Science": SUBJECT_MONO,
};
