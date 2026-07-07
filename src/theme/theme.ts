import { useColorScheme } from "react-native";
import { palette, type Palette } from "./tokens";

export interface Theme {
  colors: Palette;
  scheme: "light" | "dark";
}

/** Resolve the active palette from the OS color scheme. */
export function useTheme(): Theme {
  const scheme = useColorScheme() ?? "light";
  return { colors: palette[scheme === "dark" ? "dark" : "light"], scheme };
}
