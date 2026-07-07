/**
 * Design tokens — an iOS-26-flavored system: soft translucent surfaces, large
 * corner radii, SF-style type. Light + dark palettes. All "surface" color lives
 * here so the later Liquid Glass swap (SDK 56) is a one-place change.
 */

export const palette = {
  light: {
    bg: "#F2F2F7",
    bgElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceGlass: "rgba(255,255,255,0.72)",
    separator: "rgba(60,60,67,0.12)",
    text: "#1C1C1E",
    textDim: "#6E6E73",
    textFaint: "#AEAEB2",
    accent: "#5E5CE6", // system indigo — Reflow's signature
    accentSoft: "rgba(94,92,230,0.12)",
    danger: "#FF3B30",
    success: "#34C759",
    warning: "#FF9500",
  },
  dark: {
    bg: "#000000",
    bgElevated: "#1C1C1E",
    surface: "#1C1C1E",
    surfaceGlass: "rgba(28,28,30,0.66)",
    separator: "rgba(84,84,88,0.36)",
    text: "#FFFFFF",
    textDim: "#98989F",
    textFaint: "#636366",
    accent: "#7D7AFF",
    accentSoft: "rgba(125,122,255,0.18)",
    danger: "#FF453A",
    success: "#30D158",
    warning: "#FF9F0A",
  },
} as const;

export type Palette = Record<keyof (typeof palette)["light"], string>;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const type = {
  largeTitle: { fontSize: 34, fontWeight: "700" as const, letterSpacing: 0.37 },
  title: { fontSize: 24, fontWeight: "700" as const, letterSpacing: 0.3 },
  headline: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 17, fontWeight: "400" as const },
  callout: { fontSize: 15, fontWeight: "400" as const },
  footnote: { fontSize: 13, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "500" as const, letterSpacing: 0.2 },
};

/** Subject accent colors (extends as subjects are added). */
export const subjectColors: Record<string, string> = {
  Mathematics: "#5E5CE6",
  Physics: "#0A84FF",
  Psychology: "#FF375F",
  "Computer Science": "#30D158",
};
