import { StyleSheet, Text, View } from "react-native";
import type { WeekPlan } from "../engine/week";
import type { ReflowState } from "../state/model";
import { readinessForAll, type SubjectReadiness } from "../lib/readiness";
import { useTheme } from "../theme/theme";
import { spacing, radius, type } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

/**
 * The honest readiness surface — the "layered trust" made visible. One line per
 * subject: present-tense "READY N%" with a direction and the single next lever,
 * or an honest "NEEDS INPUT" (signal-red) when the data is too thin. NEVER a
 * grade, never a date. Every line taps to its auditable inputs (WhySheet).
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
      <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.md }]}>READINESS</Text>
      <View style={{ gap: spacing.md }}>
        {all.map((r) => {
          const name = nameOf(r.subjectId);
          return (
            <PressableScale key={r.subjectId} haptic="selection" onPress={() => onWhy(r)}
              style={[styles.row, { borderColor: colors.separator }]}>
              <View style={[styles.dot, { backgroundColor: r.enough ? colors.display : colors.textDim }]} />
              {r.enough ? (
                <Text style={[type.footnote, { color: colors.textDim, flex: 1 }]} numberOfLines={1}>
                  <Text style={[type.mono, { color: colors.text }]}>{name.toUpperCase()}</Text>
                  {"  READY "}
                  <Text style={[type.data, { color: colors.text }]}>{Math.round((r.readiness ?? 0) * 100)}%</Text>
                  {arrowFor(r)}
                  {`  ${leverFor(r)}`}
                </Text>
              ) : (
                <Text style={[type.footnote, { color: colors.textDim, flex: 1 }]} numberOfLines={1}>
                  <Text style={[type.mono, { color: colors.text }]}>{name.toUpperCase()}</Text>
                  {"  "}
                  <Text style={[type.caption, { color: colors.textDim }]}>NEEDS INPUT</Text>
                  {"  log a past paper"}
                </Text>
              )}
              <Text style={[type.mono, { color: colors.textFaint }]}>›</Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.card, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
