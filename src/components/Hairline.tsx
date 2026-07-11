import { View, type ViewStyle } from "react-native";
import { useTheme } from "../theme/theme";

/**
 * 1px hairline divider — Nothing structures with lines + whitespace, never
 * shadows. Prefer whitespace first; reach for this only when a rule genuinely
 * clarifies. `inset` pads the line horizontally; `vertical` draws a column rule.
 */
export function Hairline({ vertical = false, inset = 0, style }: {
  vertical?: boolean; inset?: number; style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        vertical
          ? { width: 1, alignSelf: "stretch", marginVertical: inset, backgroundColor: colors.separator }
          : { height: 1, alignSelf: "stretch", marginHorizontal: inset, backgroundColor: colors.separator },
        style,
      ]}
    />
  );
}
