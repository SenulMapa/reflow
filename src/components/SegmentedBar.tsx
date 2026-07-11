import { View } from "react-native";
import { useTheme } from "../theme/theme";

/**
 * The signature Nothing meter: discrete squares with 2px gaps, square ends, no
 * radius. Filled segments use `display` (white/black inversion); empties use
 * `line`. When `value` exceeds `total` (over limit) the overflow segments turn
 * signal-red — the one place this control earns the accent. Always pair with a
 * numeric readout (Doto) alongside.
 */
export function SegmentedBar({
  value, total, height = 8, gap = 2,
}: { value: number; total: number; height?: number; gap?: number }) {
  const { colors } = useTheme();
  const segs = Math.max(1, Math.round(total));
  const filled = Math.max(0, Math.min(segs, Math.round(value)));
  const over = value > total;
  return (
    <View style={{ flexDirection: "row", gap, alignItems: "center" }}>
      {Array.from({ length: segs }).map((_, i) => {
        const isFilled = i < filled;
        const color = over && isFilled ? colors.accent : isFilled ? colors.display : colors.separator;
        return <View key={i} style={{ flex: 1, height, backgroundColor: color }} />;
      })}
    </View>
  );
}
