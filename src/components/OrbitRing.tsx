import { useEffect } from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { ringMetrics, examMarkerAngleDeg, pointOnCircle } from "../ui/geometry";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** One subject as a luminous orbit: fill=coverage, marker=days-to-exam, centre=countdown. */
export function OrbitRing({
  name, color, daysToExam, coverage, lead = false, size = 78,
}: {
  name: string; color: string; daysToExam: number | null;
  coverage?: number; lead?: boolean; size?: number;
}) {
  const { colors } = useTheme();
  const stroke = 6;
  const r = size / 2 - stroke;
  const c = size / 2;
  const { circumference, dashOffset } = ringMetrics(coverage, r);
  const angle = examMarkerAngleDeg(daysToExam);
  const marker = angle == null ? null : pointOnCircle(c, c, r, angle);

  const dash = useSharedValue(circumference); // start empty
  useEffect(() => { dash.value = withTiming(dashOffset, { duration: 700 }); }, [dashOffset, dash]);
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));

  return (
    <View style={{ alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={r} stroke={colors.separator} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={c} cy={c} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={circumference} animatedProps={arcProps}
            transform={`rotate(-90 ${c} ${c})`}
          />
          {marker && (
            <Circle cx={marker.x} cy={marker.y} r={4.5} fill={colors.surface} stroke={color} strokeWidth={2.5} />
          )}
        </Svg>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={[type.data, { color: colors.text, fontSize: 20 }]}>
            {daysToExam == null ? "—" : daysToExam}
          </Text>
          <Text style={[type.caption, { color: colors.textDim, fontSize: 9 }]}>DAYS</Text>
        </View>
      </View>
      <Text style={[type.footnote, { color: colors.text, fontWeight: "700" }]}>{name}</Text>
      <Text style={[type.caption, { color: colors.textDim }]}>
        {coverage == null ? "not started" : `${Math.round(coverage * 100)}% covered`}
      </Text>
      {lead && <View style={{ height: 2, width: 20, backgroundColor: color, borderRadius: 1 }} />}
    </View>
  );
}
