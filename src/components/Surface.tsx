import { View, type ViewProps, type ViewStyle } from "react-native";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/theme";

/**
 * The single elevated-surface primitive. Every card/panel renders through this,
 * so upgrading to native Liquid Glass (SDK 56 `expo-glass-effect`) means swapping
 * only this file — nothing else in the app touches surface styling.
 */
export function Surface({
  style,
  padded = true,
  ...props
}: ViewProps & { padded?: boolean }) {
  const { colors, scheme } = useTheme();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: padded ? spacing.lg : 0,
    borderWidth: scheme === "dark" ? 1 : 0,
    borderColor: colors.separator,
    // Soft iOS-style elevation (kept subtle; glass will replace this later).
    shadowColor: "#000",
    shadowOpacity: scheme === "dark" ? 0 : 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  };
  return <View style={[base, style]} {...props} />;
}
