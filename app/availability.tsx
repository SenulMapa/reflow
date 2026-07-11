import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { DotField } from "../src/components/DotField";
import { PressableScale } from "../src/components/PressableScale";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { AVAILABILITY_PRESETS } from "../src/lib/buildWeek";

const DAYS = [
  { wd: 1, label: "Monday" },
  { wd: 2, label: "Tuesday" },
  { wd: 3, label: "Wednesday" },
  { wd: 4, label: "Thursday" },
  { wd: 5, label: "Friday" },
  { wd: 6, label: "Saturday" },
  { wd: 0, label: "Sunday" },
];

export default function Availability() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const setAvailability = useStore((s) => s.setAvailability);
  const availability = state.config.availability;

  const isOn = (wd: number, start: number, end: number) =>
    (availability[wd] ?? []).some((w) => w.start === start && w.end === end);

  function toggle(wd: number, preset: (typeof AVAILABILITY_PRESETS)[number]) {
    const on = isOn(wd, preset.start, preset.end);
    const kept = (availability[wd] ?? []).filter((w) => !(w.start === preset.start && w.end === preset.end));
    const next = on ? kept : [...kept, { start: preset.start, end: preset.end }].sort((a, b) => a.start - b.start);
    setAvailability(wd, next);
  }

  const totalHours =
    Object.values(availability)
      .flat()
      .reduce((t, w) => t + (w.end - w.start), 0) / 60;
  const totalDisplay = totalHours % 1 === 0 ? String(totalHours) : totalHours.toFixed(1);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/setup" asChild>
          <Pressable hitSlop={10}>
            <Text style={[type.caption, { color: colors.textDim }]}>‹ SETUP</Text>
          </Pressable>
        </Link>
        <Text style={[type.largeTitle, { color: colors.text }]}>Availability</Text>
        <View style={styles.statRow}>
          <Text style={[type.numeral, { color: colors.text, fontSize: 34, lineHeight: 38 }]}>{totalDisplay}</Text>
          <Text style={[type.caption, { color: colors.textDim }]}>HOURS / WEEK OF CANVAS</Text>
        </View>
        <Text style={[type.callout, { color: colors.textDim, marginBottom: spacing.lg }]}>
          When could you study? The schedule fills the slack.
        </Text>

        <View style={{ gap: spacing.sm }}>
          {DAYS.map((d) => (
            <Surface key={d.wd} style={{ gap: spacing.md }}>
              <Text style={[type.mono, { color: colors.text, textTransform: "uppercase" }]}>{d.label}</Text>
              <View style={styles.presets}>
                {AVAILABILITY_PRESETS.map((p) => {
                  const on = isOn(d.wd, p.start, p.end);
                  return (
                    <PressableScale
                      key={p.key}
                      onPress={() => toggle(d.wd, p)}
                      style={[
                        styles.preset,
                        on
                          ? { backgroundColor: colors.display, borderColor: colors.display }
                          : { backgroundColor: "transparent", borderColor: colors.line2 },
                      ]}
                    >
                      <Text style={[type.caption, { color: on ? colors.bg : colors.text }]}>
                        {p.label.toUpperCase()}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </Surface>
          ))}
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, ...bounded },
  statRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.xs },
  presets: { flexDirection: "row", gap: spacing.sm },
  preset: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, borderWidth: 1, alignItems: "center" },
});
