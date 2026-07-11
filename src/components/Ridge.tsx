import { View, Text } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { ridgePath } from "../ui/geometry";
import { Surface } from "./Surface";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

const W = 280, H = 56;

export function Ridge({
  values, labels, todayIndex, totalLabel, subLabel,
}: {
  values: number[]; labels: string[]; todayIndex: number; totalLabel: string; subLabel?: string;
}) {
  const { colors } = useTheme();
  const { line, area, points } = ridgePath(values, W, H, 8);
  const today = points[todayIndex];
  return (
    <Surface style={{ paddingBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={[type.title, { color: colors.text }]}>{totalLabel}</Text>
        {subLabel && <Text style={[type.caption, { color: colors.textDim }]}>{subLabel}</Text>}
      </View>
      {/* Monochrome momentum trend — no gradient, no accent. The line and today
          marker read in the foreground colour; structure comes from the plot, not hue. */}
      <Svg width="100%" height={H + 16} viewBox={`0 0 ${W} ${H + 16}`} style={{ marginTop: spacing.sm }}>
        <Path d={area} fill={colors.text} fillOpacity={0.06} />
        <Path d={line} stroke={colors.text} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {today && <Circle cx={today.x} cy={today.y} r={4} fill={colors.surface} stroke={colors.text} strokeWidth={2.4} />}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 }}>
        {labels.map((l, i) => (
          <Text key={i} style={[type.caption, { color: i === todayIndex ? colors.text : colors.textFaint, letterSpacing: 0 }]}>{l}</Text>
        ))}
      </View>
    </Surface>
  );
}
