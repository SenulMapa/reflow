import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { AVAILABILITY_PRESETS } from "../src/lib/buildWeek";
import { fmtHours } from "../src/lib/format";

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/setup" asChild>
          <Pressable hitSlop={10}>
            <Text style={[type.headline, { color: colors.accent }]}>‹ Setup</Text>
          </Pressable>
        </Link>
        <Text style={[type.largeTitle, { color: colors.text }]}>Availability</Text>
        <Text style={[type.callout, { color: colors.textDim, marginBottom: spacing.lg }]}>
          When could you study? {fmtHours(totalHours)}/week of canvas — the schedule fills the slack.
        </Text>

        <View style={{ gap: spacing.sm }}>
          {DAYS.map((d) => (
            <Surface key={d.wd} style={{ gap: spacing.md }}>
              <Text style={[type.headline, { color: colors.text }]}>{d.label}</Text>
              <View style={styles.presets}>
                {AVAILABILITY_PRESETS.map((p) => {
                  const on = isOn(d.wd, p.start, p.end);
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => toggle(d.wd, p)}
                      style={[
                        styles.preset,
                        { backgroundColor: on ? colors.accent : colors.accentSoft },
                      ]}
                    >
                      <Text style={[type.footnote, { color: on ? "#fff" : colors.accent, fontWeight: "600" }]}>
                        {p.label}
                      </Text>
                    </Pressable>
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
  scroll: { padding: spacing.lg },
  presets: { flexDirection: "row", gap: spacing.sm },
  preset: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
});
