import { StyleSheet, Text, View } from "react-native";
import type { WeekPlan } from "../engine/week";
import type { ReflowState } from "../state/model";
import { readinessForAll, type SubjectReadiness } from "../lib/readiness";
import { useTheme } from "../theme/theme";
import { spacing, radius, type, subjectColors } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

/**
 * The honest readiness surface — the "layered trust" made visible. One line per
 * subject: present-tense "Ready N%" with a direction and the single next lever,
 * or an honest "not enough signal yet" when the data is too thin. NEVER a grade,
 * never a date. Every line taps to its auditable inputs (WhySheet).
 */
const arrowFor = (r: SubjectReadiness): string => {
  if (r.dataStrength === "thin" || r.trend == null) return "";
  return r.trend > 0 ? " ↑" : r.trend < 0 ? " ↓" : " →";
};

// The lowest input, phrased as the next action.
const leverFor = (r: SubjectReadiness): string => {
  const perf = r.performance ?? 0;
  const min = Math.min(perf, r.coverage, r.pace);
  if (min === perf) return "log timed past papers";
  if (min === r.coverage) return "raise your weakest topic";
  return "bank more focus hours";
};

export function ReadinessSection({
  state, plan, weekDates, onWhy,
}: {
  state: ReflowState;
  plan: WeekPlan;
  weekDates: string[];
  onWhy: (r: SubjectReadiness) => void;
}) {
  const { colors } = useTheme();
  const all = readinessForAll(state, plan, weekDates);
  if (all.length === 0) return null;
  const nameOf = (id: string) => state.config.subjects.find((s) => s.id === id)?.name ?? id;

  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>READINESS</Text>
      <View style={{ gap: spacing.sm }}>
        {all.map((r) => {
          const name = nameOf(r.subjectId);
          const dot = subjectColors[name] ?? colors.accent;
          return (
            <PressableScale key={r.subjectId} haptic="selection" onPress={() => onWhy(r)}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
              <View style={[styles.dot, { backgroundColor: dot }]} />
              {r.enough ? (
                <Text style={[type.footnote, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                  <Text style={{ fontWeight: "700" }}>{name}</Text>
                  {" · "}Ready {Math.round((r.readiness ?? 0) * 100)}%{arrowFor(r)}
                  <Text style={{ color: colors.textDim }}>{` — ${leverFor(r)}`}</Text>
                </Text>
              ) : (
                <Text style={[type.footnote, { color: colors.textDim, flex: 1 }]} numberOfLines={1}>
                  <Text style={{ fontWeight: "700", color: colors.text }}>{name}</Text>
                  {" · "}Not enough signal yet — log a past paper.
                </Text>
              )}
              <Text style={{ color: colors.textFaint, fontSize: 15 }}>›</Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
