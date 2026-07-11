import { useEffect } from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { ringMetrics, examMarkerAngleDeg, pointOnCircle } from "../ui/geometry";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Urgent exams (≤7 days) earn the signal-red; everything else is monochrome. */
const URGENT_DAYS = 7;

/**
 * Nothing gauge: thin monochrome ring (coverage arc in `display`), a small
 * day-marker, and a centred Doto countdown numeral. The arc turns signal-red
 * ONLY when the exam is urgent — the single place this control uses the accent.
 * `color` is accepted for API compatibility but no longer drives the arc
 * (subjects are monochrome now; differentiate by the label beneath).
 */
export function OrbitRing({
  name, daysToExam, coverage, lead = false, size = 78,
}: {
  name: string; color?: string; daysToExam: number | null;
  coverage?: number; lead?: boolean; size?: number;
}) {
  const { colors } = useTheme();
  const urgent = daysToExam != null && daysToExam <= URGENT_DAYS;
  const arc = urgent ? colors.accent : colors.display;
  const stroke = 5;
  const r = size / 2 - stroke;
  const c = size / 2;
  const { circumference, dashOffset } = ringMetrics(coverage, r);
  const angle = examMarkerAngleDeg(daysToExam);
  const marker = angle == null ? null : pointOnCircle(c, c, r, angle);

  const dash = useSharedValue(circumference); // start empty
  useEffect(() => { dash.value = withTiming(dashOffset, { duration: 400 }); }, [dashOffset, dash]);
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));

  return (
    <View style={{ alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={r} stroke={colors.separator} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={c} cy={c} r={r} stroke={arc} strokeWidth={stroke} fill="none"
            strokeLinecap="butt" strokeDasharray={circumference} animatedProps={arcProps}
            transform={`rotate(-90 ${c} ${c})`}
          />
          {marker && (
            <Circle cx={marker.x} cy={marker.y} r={3.5} fill={colors.bg} stroke={arc} strokeWidth={2} />
          )}
        </Svg>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={[type.numeral, { color: colors.display, fontSize: 28, lineHeight: 30 }]}>
            {daysToExam == null ? "—" : daysToExam}
          </Text>
          <Text style={[type.caption, { color: colors.textDim, fontSize: 9 }]}>DAYS</Text>
        </View>
      </View>
      <Text style={[type.caption, { color: colors.text }]}>{name}</Text>
      <Text style={[type.caption, { color: colors.textDim }]}>
        {coverage == null ? "NOT STARTED" : `${Math.round(coverage * 100)}% COVERED`}
      </Text>
      {lead && <View style={{ height: 2, width: 18, backgroundColor: arc }} />}
    </View>
  );
}
