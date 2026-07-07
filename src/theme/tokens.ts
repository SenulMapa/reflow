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

/**
 * Type scale on system SF. `fontFamily` is explicitly `undefined` (system font)
 * so `fontWeight` is honoured AND existing `type.x.fontFamily` reads still
 * typecheck. Heavy tight weights for display; tracked uppercase for captions.
 */
const t = (
  fontSize: number,
  lineHeight: number,
  fontWeight: TextStyle["fontWeight"],
  extra: Partial<TextStyle> = {},
): TextStyle => ({ fontFamily: undefined, fontSize, lineHeight, fontWeight, ...extra });

export const type = {
  hero:       t(34, 38, "800", { letterSpacing: -0.6 }),
  heroItalic: t(30, 34, "800", { letterSpacing: -0.4, fontStyle: "italic" }),
  largeTitle: t(28, 32, "800", { letterSpacing: -0.4 }),
  title:      t(22, 26, "700", { letterSpacing: -0.2 }),
  serif:      t(20, 27, "600"), // "serif" key retained; now a calm strong title
  headline:   t(16, 20, "700"),
  body:       t(15, 22, "400"),
  callout:    t(14, 20, "500"),
  footnote:   t(13, 18, "500"),
  caption:    t(11, 14, "700", { letterSpacing: 1.4, textTransform: "uppercase" }),
  data:       t(16, 20, "700", { fontVariant: ["tabular-nums"] }),
} as const;

/** Subject accent colours — carry both themes. */
export const subjectColors: Record<string, string> = {
  Mathematics: "#5B6CFF",
  Physics: "#2E9E8F",
  Psychology: "#C65B7C",
  "Computer Science": "#7DA13A",
};
