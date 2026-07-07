import type { TextStyle } from "react-native";

/**
 * "Orbit" identity — system-adaptive. Light = warm editorial (kraft paper,
 * burnt-orange). Dark = glass at night (violet-biased near-black, violet accent,
 * amber for rewards). SF (system) carries type; the subject ORBIT ring is the
 * signature. Every token key from the previous identity is preserved so the
 * whole app re-skins from this one file.
 */
export const palette = {
  light: {
    bg: "#EFE7D6",            // warm kraft paper
    surface: "#F7F1E4",       // raised card
    separator: "rgba(38,34,28,0.10)",
    text: "#26221C",
    textDim: "#8C8069",
    textFaint: "#B6A988",
    accent: "#D9541E",        // burnt orange
    accentSoft: "#F4DCC8",
    gold: "#C8862E",          // rewards: coins / streak / XP (warm, distinct from accent)
    goldSoft: "rgba(200,134,46,0.15)",
    danger: "#C7503C",
    success: "#3F9E6A",
    warning: "#E7A339",
  },
  dark: {
    bg: "#141219",            // violet-biased near-black
    surface: "#211E2B",       // glass card
    separator: "rgba(233,229,242,0.10)",
    text: "#E9E5F2",
    textDim: "#8A839C",
    textFaint: "#5B5470",
    accent: "#8B6FFF",        // violet
    accentSoft: "#26203F",
    gold: "#E7A339",          // amber rewards glow
    goldSoft: "rgba(231,163,57,0.16)",
    danger: "#E0705B",
    success: "#5FB088",
    warning: "#E7A339",
  },
} as const;

export type Palette = Record<keyof (typeof palette)["light"], string>;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 } as const;

/** iPad/large-screen: cap the content column and centre it so the reading
 *  measure stays comfortable instead of stretching edge-to-edge. */
export const CONTENT_MAX_WIDTH = 600;
export const bounded = { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" } as const;

/**
 * Editorial identity: **PP Editorial New** across the whole app. Only two weights
 * ship (Ultralight + Ultrabold + italics), so we pair them deliberately — Ultrabold
 * carries display, labels, and data (legible + striking at any size); Ultralight
 * carries reading text (elegant high-contrast serif); italics for accents. Loaded
 * in `app/_layout.tsx` via `useFonts`. NOTE: with a specific-weight fontFamily, RN
 * ignores `fontWeight`, so weight lives in the family name.
 */
export const fonts = {
  display: "PPEditorialUltrabold",
  displayItalic: "PPEditorialUltraboldItalic",
  light: "PPEditorialUltralight",
  lightItalic: "PPEditorialUltralightItalic",
} as const;

const t = (
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  extra: Partial<TextStyle> = {},
): TextStyle => ({ fontFamily, fontSize, lineHeight, ...extra });

export const type = {
  hero:       t(fonts.display, 40, 44, { letterSpacing: -0.5 }),
  heroItalic: t(fonts.displayItalic, 36, 40, { letterSpacing: -0.4 }),
  largeTitle: t(fonts.display, 32, 36, { letterSpacing: -0.4 }),
  title:      t(fonts.display, 25, 30, { letterSpacing: -0.2 }),
  serif:      t(fonts.light, 22, 30), // calm light-serif subtitle / empty-state voice
  headline:   t(fonts.display, 17, 22),
  body:       t(fonts.light, 16, 24),
  callout:    t(fonts.light, 15, 21),
  footnote:   t(fonts.light, 13.5, 19),
  caption:    t(fonts.display, 11, 14, { letterSpacing: 1.2, textTransform: "uppercase" }),
  data:       t(fonts.display, 17, 21, { fontVariant: ["tabular-nums"] }),
} as const;

/** Subject accent colours — carry both themes. */
export const subjectColors: Record<string, string> = {
  Mathematics: "#5B6CFF",
  Physics: "#2E9E8F",
  Psychology: "#C65B7C",
  "Computer Science": "#7DA13A",
};
