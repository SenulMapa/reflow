/**
 * "Exam Almanac" design tokens — a calm, editorial identity: warm paper, slate
 * ink, a scholarly slate-teal, and a single warm GOLD reserved for rewards
 * (coins, streaks, XP) so earning always glows. Fraunces (serif) carries the
 * personality; Inter handles body + data. Light + dark.
 */

export const palette = {
  light: {
    bg: "#F2F0E8", // warm paper
    bgElevated: "#FBFAF5",
    surface: "#FBFAF5",
    surfaceGlass: "rgba(251,250,245,0.8)",
    separator: "rgba(34,37,43,0.10)",
    text: "#22252B", // slate ink
    textDim: "#6C6F76",
    textFaint: "#AAA79D",
    accent: "#2F4858", // scholarly slate-teal
    accentSoft: "rgba(47,72,88,0.10)",
    gold: "#B07D3F", // rewards: coins / streak / XP
    goldSoft: "rgba(176,125,63,0.14)",
    danger: "#B23A48",
    success: "#3E7A5E",
    warning: "#B07D3F",
  },
  dark: {
    bg: "#161719",
    bgElevated: "#202225",
    surface: "#202225",
    surfaceGlass: "rgba(32,34,37,0.72)",
    separator: "rgba(236,234,227,0.12)",
    text: "#ECEAE3",
    textDim: "#9A9C9E",
    textFaint: "#63656A",
    accent: "#89AEBC", // lifted slate-teal for dark paper
    accentSoft: "rgba(137,174,188,0.15)",
    gold: "#D6A45E",
    goldSoft: "rgba(214,164,94,0.16)",
    danger: "#E06B78",
    success: "#5FB088",
    warning: "#D6A45E",
  },
} as const;

export type Palette = Record<keyof (typeof palette)["light"], string>;

/** Loaded via @expo-google-fonts in the root layout. */
export const fonts = {
  displayReg: "Fraunces_400Regular",
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_400Regular_Italic",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;

/**
 * Type scale. Fraunces for display/serif, Inter for the rest. NOTE: with a
 * specific-weight fontFamily, RN ignores fontWeight — weight lives in the family.
 */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.5 },
  heroItalic: { fontFamily: fonts.displayItalic, fontSize: 38, lineHeight: 42, letterSpacing: -0.3 },
  largeTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.3 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.2 },
  serif: { fontFamily: fonts.displayReg, fontSize: 22, lineHeight: 28 },
  headline: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  footnote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },
  data: { fontFamily: fonts.semibold, fontSize: 16, fontVariant: ["tabular-nums" as const] },
};

/** Subject accent colors — muted, editorial. */
export const subjectColors: Record<string, string> = {
  Mathematics: "#3A5199",
  Physics: "#2E7D6B",
  Psychology: "#A8475E",
  "Computer Science": "#6B7A3A",
};
