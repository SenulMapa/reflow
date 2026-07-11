import { Pressable, Text, View } from "react-native";
import type { WeekPlan } from "../engine/week";
import type { ReflowState } from "../state/model";
import { focusMinutesOn } from "../state/model";
import { bankedMinutesBySubject } from "../lib/readiness";
import { fmtHours } from "../lib/format";
import { useTheme } from "../theme/theme";
import { spacing, type } from "../theme/tokens";
import { SegmentedBar } from "./SegmentedBar";

/**
 * Week pulse — one honest line: real focused hours vs the weekly goal, plus the
 * subject falling furthest behind its allocation, and a segmented progress bar.
 * All from logged focus (never planned totals) so it can be trusted.
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

  return (
    <Pressable onPress={onOpenWeek} style={{ marginTop: spacing.lg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
        <Text style={[type.caption, { color: colors.textDim }]}>THIS WEEK</Text>
        <Text style={[type.caption, { color: colors.textFaint }]}>›</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
        <Text style={[type.data, { color: colors.text }]}>{fmtHours(focusedMin / 60)}</Text>
        <Text style={[type.mono, { color: colors.textFaint }]}>/ {fmtHours(goalH)}</Text>
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <SegmentedBar value={focusedMin / 60} total={goalH} />
      </View>
      {laggard ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          <Text style={[type.caption, { color: colors.textDim }]}>{laggard.name.toUpperCase()} BEHIND</Text>
          <Text style={[type.data, { color: colors.text }]}>{fmtHours(laggard.gapH)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
