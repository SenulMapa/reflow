import { useColorScheme } from "react-native";
import { palette, type Palette } from "./tokens";

export interface Theme {
  colors: Palette;
  scheme: "light" | "dark";
}

/** Resolve the active palette from the OS color scheme. */
export function useTheme(): Theme {
  // RN 0.85 widened useColorScheme() to include "unspecified" — coerce to our two.
  const scheme: "light" | "dark" = useColorScheme() === "dark" ? "dark" : "light";
  return { colors: palette[scheme], scheme };
}
