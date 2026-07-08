import { Pressable, StyleSheet, Text, View } from "react-native";
import type { WeekPlan } from "../engine/week";
import type { ReflowState } from "../state/model";
import { focusMinutesOn } from "../state/model";
import { bankedMinutesBySubject } from "../lib/readiness";
import { fmtHours } from "../lib/format";
import { useTheme } from "../theme/theme";
import { spacing, radius, type } from "../theme/tokens";

/**
 * Week pulse — one honest line: real focused hours vs the weekly goal, plus the
 * subject falling furthest behind its allocation, and a thin progress bar. All
 * from logged focus (never planned totals) so it can be trusted.
 */
export function WeekPulse({
  state, plan, weekDates, onOpenWeek,
}: {
  state: ReflowState;
  plan: WeekPlan;
  weekDates: string[];
  onOpenWeek: () => void;
}) {
  const { colors } = useTheme();
  const focusedMin = weekDates.reduce((t, d) => t + focusMinutesOn(state, d), 0);
  const goalH = state.config.weeklyGoalHours;
  const nameOf = (id: string) => state.config.subjects.find((s) => s.id === id)?.name ?? id;

  // Biggest positive (allocated − banked) gap = the subject most behind.
  const banked = bankedMinutesBySubject(state, weekDates);
  let laggard: { name: string; gapH: number } | null = null;
  for (const a of plan.allocations) {
    const gapH = a.hours - (banked[a.subjectId] ?? 0) / 60;
    if (gapH > 0.5 && (!laggard || gapH > laggard.gapH)) laggard = { name: nameOf(a.subjectId), gapH };
  }

  const pct = goalH > 0 ? Math.min(1, focusedMin / 60 / goalH) : 0;

  return (
    <Pressable onPress={onOpenWeek} style={{ marginTop: spacing.lg }}>
      <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>THIS WEEK</Text>
      <Text style={[type.callout, { color: colors.text }]}>
        {fmtHours(focusedMin / 60)} / {fmtHours(goalH)}
        {laggard ? <Text style={{ color: colors.textDim }}>{`  ·  ${laggard.name} behind ${fmtHours(laggard.gapH)}`}</Text> : null}
        <Text style={{ color: colors.textFaint }}>{"  ›"}</Text>
      </Text>
      <View style={[styles.track, { backgroundColor: colors.separator }]}>
        <View style={[styles.fill, { backgroundColor: colors.accent, width: `${pct * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: spacing.sm },
  fill: { height: "100%", borderRadius: radius.sm },
});
