import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { WeekPlan } from "../engine/week";
import type { PlacedSession } from "../engine/placer/types";
import type { ReflowState } from "../state/model";
import { sessionKeyOf } from "../state/model";
import { fmtTime } from "../lib/format";
import { useTheme } from "../theme/theme";
import { spacing, radius, type, subjectColors } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

/**
 * Today at a glance — the rest of today's sessions as chips (done ✓ / now ▶ /
 * upcoming time). Tap a chip to tick it done; tap the header to open the week.
 * Reuses the plan + sessionStatus already on state; no new logic.
 */
export function TodayStrip({
  state, plan, nowISO, currentKey, onToggle, onOpenWeek,
}: {
  state: ReflowState;
  plan: WeekPlan;
  nowISO: string;
  currentKey?: string;
  onToggle: (s: PlacedSession) => void;
  onOpenWeek: () => void;
}) {
  const { colors } = useTheme();
  const nameOf = (id: string) => state.config.subjects.find((s) => s.id === id)?.name ?? id;
  const today = plan.sessions
    .filter((s) => s.date === nowISO)
    .sort((a, b) => a.interval.start - b.interval.start);

  if (today.length === 0) return null;
  const doneCount = today.filter((s) => state.sessionStatus[sessionKeyOf(s)] === "done").length;

  return (
    <View style={{ marginTop: spacing.lg }}>
      <Pressable onPress={onOpenWeek} hitSlop={8} style={styles.header}>
        <Text style={[type.caption, { color: colors.textDim }]}>TODAY</Text>
        <Text style={[type.caption, { color: colors.textFaint }]}>{doneCount}/{today.length} done  ›</Text>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
        {today.map((s) => {
          const key = sessionKeyOf(s);
          const status = state.sessionStatus[key];
          const done = status === "done";
          const skipped = status === "skipped";
          const isCurrent = key === currentKey;
          const color = subjectColors[nameOf(s.subjectId)] ?? colors.accent;
          return (
            <PressableScale key={key} haptic="selection" onPress={() => onToggle(s)}
              style={[styles.chip, {
                backgroundColor: done ? color : colors.surface,
                borderColor: isCurrent ? color : colors.separator,
                borderWidth: isCurrent ? 2 : 1,
                opacity: skipped ? 0.5 : 1,
              }]}>
              <Text style={[type.footnote, { fontWeight: "700", color: done ? "#fff" : colors.text }]} numberOfLines={1}>
                {done ? "✓ " : isCurrent ? "▶ " : ""}{nameOf(s.subjectId)}
              </Text>
              <Text style={[type.caption, { color: done ? "rgba(255,255,255,0.85)" : colors.textFaint }]}>
                {skipped ? "skipped" : fmtTime(s.interval.start)}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  chip: { minWidth: 92, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, gap: 2 },
});
