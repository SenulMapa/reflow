import { View, type ViewProps, type ViewStyle } from "react-native";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/theme";

/**
 * The single elevated-surface primitive. Every card/panel renders through this.
 *
 * Native "Liquid Glass" (expo-glass-effect) was removed in the 2.0 rebuild: it
 * required the ExpoGlassEffect pod to be linked, which threw at launch on the
 * re-signed SideStore IPA. Nothing's design language bans shadows/elevation
 * anyway — structure comes from a 1px hairline + the surface fill alone, so the
 * flat surface IS the intended look, not a fallback.
 */
export function Surface({
  style,
  padded = true,
  filled = false,
  ...props
}: ViewProps & { padded?: boolean; filled?: boolean }) {
  const { colors } = useTheme();

  // Card style A (locked): 20px rounded, 1px hairline, NO fill — "round the
  // corners, keep the ruler". The hairline IS the brand; a filled grey blob reads
  // as generic-wellness. `filled` is an opt-in for the rare card that must occlude
  // the dot-field behind it.
  const base: ViewStyle = {
    backgroundColor: filled ? colors.surface : "transparent",
    borderRadius: radius.card,
    padding: padded ? spacing.lg : 0,
    borderWidth: 1,
    borderColor: colors.separator,
  };
  return <View style={[base, style]} {...props} />;
}
