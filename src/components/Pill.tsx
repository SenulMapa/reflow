import { Text, View, type ViewStyle } from "react-native";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../theme/theme";
import { type, radius, spacing } from "../theme/tokens";

/**
 * The ONE soft "press me" shape per screen — a full-pill primary action (Fable:
 * "the only shape that says press me and relax"). Inverts black↔white like every
 * Nothing active control; it does NOT colorize. `tone="signal"` is reserved for
 * the single genuine call-to-action that IS the current action (uses signal-red
 * fill) — use sparingly, one per screen at most.
 */
export function Pill({
  label,
  onPress,
  tone = "invert",
  disabled = false,
  style,
  haptic = "success",
}: {
  label: string;
  onPress?: () => void;
  tone?: "invert" | "signal" | "outline";
  disabled?: boolean;
  style?: ViewStyle;
  haptic?: "selection" | "success" | "light" | false;
}) {
  const { colors } = useTheme();
  const bg =
    tone === "signal" ? colors.accent : tone === "outline" ? "transparent" : colors.display;
  const fg =
    tone === "signal" ? "#FFFFFF" : tone === "outline" ? colors.text : colors.bg;
  const border = tone === "outline" ? colors.line2 : "transparent";
  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      haptic={haptic}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View
        style={[
          {
            backgroundColor: bg,
            borderColor: border,
            borderWidth: tone === "outline" ? 1 : 0,
            borderRadius: radius.pill,
            paddingVertical: 15,
            paddingHorizontal: spacing.xxl,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        <Text style={[type.mono, { color: fg, letterSpacing: 1.5, textTransform: "uppercase" }]}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
