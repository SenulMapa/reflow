import { View, Text } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
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
        {subLabel && <Text style={[type.footnote, { color: colors.textDim }]}>{subLabel}</Text>}
      </View>
      <Svg width="100%" height={H + 16} viewBox={`0 0 ${W} ${H + 16}`}>
        <Defs>
          <LinearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#ridge)" />
        <Path d={line} stroke={colors.accent} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {today && <Circle cx={today.x} cy={today.y} r={5} fill={colors.surface} stroke={colors.accent} strokeWidth={2.6} />}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 }}>
        {labels.map((l, i) => (
          <Text key={i} style={[type.caption, { color: i === todayIndex ? colors.accent : colors.textFaint, letterSpacing: 0 }]}>{l}</Text>
        ))}
      </View>
    </Surface>
  );
}
