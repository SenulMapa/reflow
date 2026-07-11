import { Text, View, StyleSheet } from "react-native";
import { PressableScale } from "./PressableScale";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

/**
 * The Home footer cue (Fable IA): ONE hairline row, pure monochrome — streak ·
 * garden · nearest-exam countdown. This is where reward/garden/exam state gets a
 * *cue* without earning a *card*. Tapping opens Progress, where the detail lives.
 * No red here (nothing on this row is the current action).
 */
export function AmbientStrip({
  streakDays,
  plantsGrown,
  daysToExam,
  onPress,
}: {
  streakDays: number;
  plantsGrown: number;
  daysToExam: number | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const Cell = ({ value, label }: { value: string; label: string }) => (
    <View style={styles.cell}>
      <Text style={[type.data, { color: colors.text }]}>{value}</Text>
      <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>{label}</Text>
    </View>
  );
  return (
    <PressableScale haptic="light" onPress={onPress} style={[styles.row, { borderTopColor: colors.separator }]}>
      <Cell value={String(streakDays)} label="DAY STREAK" />
      <View style={[styles.div, { backgroundColor: colors.separator }]} />
      <Cell value={String(plantsGrown)} label="GROWN" />
      <View style={[styles.div, { backgroundColor: colors.separator }]} />
      <Cell value={daysToExam == null ? "—" : String(daysToExam)} label="DAYS TO EXAM" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    marginTop: spacing.xl,
  },
  cell: { flex: 1, alignItems: "center" },
  div: { width: 1, height: 28 },
});
