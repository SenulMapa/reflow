import { Link } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { Hairline } from "../src/components/Hairline";
import { SegmentedBar } from "../src/components/SegmentedBar";
import { DotField } from "../src/components/DotField";
import { PressableScale } from "../src/components/PressableScale";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { computePlan } from "../src/state/model";
import { effectiveConfidence } from "../src/data/subjects";
import { syncSessionReminders } from "../src/lib/notify";

/** Subjects available to add (beyond whatever is already configured). */
const CATALOG = [
  { id: "cs", name: "Computer Science", confidence: 5 },
  { id: "chem", name: "Chemistry", confidence: 5 },
  { id: "bio", name: "Biology", confidence: 5 },
];

/** Outline +/− stepper with the current value in Doto, centred. */
function Stepper({
  value,
  onDec,
  onInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepper}>
      <PressableScale onPress={onDec} hitSlop={8} style={[styles.stepBtn, { borderColor: colors.line2 }]}>
        <Text style={[type.headline, { color: colors.text }]}>−</Text>
      </PressableScale>
      <Text style={[type.data, { color: colors.text, minWidth: 22, textAlign: "center" }]}>{value}</Text>
      <PressableScale onPress={onInc} hitSlop={8} style={[styles.stepBtn, { borderColor: colors.line2 }]}>
        <Text style={[type.headline, { color: colors.text }]}>＋</Text>
      </PressableScale>
    </View>
  );
}

export default function Setup() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const setWeeklyGoal = useStore((s) => s.setWeeklyGoal);
  const setConfidence = useStore((s) => s.setConfidence);
  const setTopicConfidence = useStore((s) => s.setTopicConfidence);
  const removeSubject = useStore((s) => s.removeSubject);
  const addSubject = useStore((s) => s.addSubject);
  const reset = useStore((s) => s.reset);

  const goal = state.config.weeklyGoalHours;
  const configured = new Set(state.config.subjects.map((s) => s.id));
  const addable = CATALOG.filter((c) => !configured.has(c.id));

  const nameById = Object.fromEntries(state.config.subjects.map((s) => [s.id, s.name]));
  const [remStatus, setRemStatus] = useState<string>("Ping me before each session");
  async function enableReminders() {
    setRemStatus("Enabling…");
    const n = await syncSessionReminders(computePlan(state).sessions, (id) => nameById[id] ?? id, { prompt: true });
    setRemStatus(n > 0 ? `On · ${n} reminder${n === 1 ? "" : "s"} scheduled` : "Not available on this device");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Link href="/" asChild>
            <Pressable hitSlop={10}>
              <Text style={[type.caption, { color: colors.textDim }]}>‹ WEEK</Text>
            </Pressable>
          </Link>
          <Pressable onPress={reset} hitSlop={10}>
            <Text style={[type.caption, { color: colors.textDim }]}>RESET</Text>
          </Pressable>
        </View>
        <Text style={[type.largeTitle, { color: colors.text, marginBottom: spacing.lg }]}>Setup</Text>

        {/* Weekly goal */}
        <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>WEEKLY GOAL</Text>
        <Surface style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.footnote, { color: colors.textDim }]}>Total study time to distribute</Text>
            <Text style={[type.caption, { color: colors.textFaint }]}>HOURS / WEEK</Text>
          </View>
          <Stepper value={goal} onDec={() => setWeeklyGoal(goal - 1)} onInc={() => setWeeklyGoal(goal + 1)} />
        </Surface>

        <Link href="/availability" asChild>
          <Pressable>
            <Surface style={[styles.row, { marginTop: spacing.sm }]}>
              <Text style={[type.headline, { color: colors.text, flex: 1 }]}>Availability</Text>
              <Text style={[type.caption, { color: colors.text }]}>EDIT ›</Text>
            </Surface>
          </Pressable>
        </Link>

        <Link href="/sources" asChild>
          <Pressable>
            <Surface style={[styles.row, { marginTop: spacing.sm }]}>
              <Text style={[type.headline, { color: colors.text, flex: 1 }]}>Knowledge Base</Text>
              <Text style={[type.caption, { color: colors.text }]}>SOURCES ›</Text>
            </Surface>
          </Pressable>
        </Link>

        <Pressable onPress={enableReminders}>
          <Surface style={[styles.row, { marginTop: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text style={[type.headline, { color: colors.text }]}>Session reminders</Text>
              <Text style={[type.footnote, { color: colors.textDim }]}>{remStatus}</Text>
            </View>
            <Text style={[type.caption, { color: colors.text }]}>ENABLE ›</Text>
          </Surface>
        </Pressable>

        {/* Subjects */}
        <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          SUBJECTS · CONFIDENCE DRIVES THE SPLIT
        </Text>
        <View style={{ gap: spacing.sm }}>
          {state.config.subjects.map((s) => {
            const eff = effectiveConfidence(s);
            const hasTopics = !!s.topics && s.topics.length > 0;
            return (
              <Surface key={s.id} style={{ gap: spacing.md }}>
                <View style={styles.subjectRow}>
                  <View style={[styles.dot, { backgroundColor: colors.text }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.mono, { color: colors.text, textTransform: "uppercase" }]}>{s.name}</Text>
                    <View style={styles.readout}>
                      <Text style={[type.data, { color: colors.textDim }]}>
                        {hasTopics ? eff.toFixed(1) : s.confidence}
                      </Text>
                      <Text style={[type.caption, { color: colors.textFaint }]}>
                        {hasTopics ? "/10 AVG" : "/10 CONFIDENCE"}
                      </Text>
                    </View>
                  </View>
                  {!hasTopics && (
                    <Stepper value={s.confidence} onDec={() => setConfidence(s.id, s.confidence - 1)} onInc={() => setConfidence(s.id, s.confidence + 1)} />
                  )}
                  <Pressable onPress={() => removeSubject(s.id)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
                    <Text style={[type.mono, { color: colors.textFaint }]}>✕</Text>
                  </Pressable>
                </View>

                {!hasTopics && <SegmentedBar value={s.confidence} total={10} />}

                {hasTopics && (
                  <View style={{ gap: spacing.md }}>
                    <Hairline />
                    {s.topics!.map((t) => (
                      <View key={t.id} style={styles.topicRow}>
                        <View style={{ flex: 1, gap: spacing.xs }}>
                          <Text style={[type.mono, { color: colors.text, textTransform: "uppercase" }]}>{t.name}</Text>
                          <SegmentedBar value={t.confidence} total={10} />
                        </View>
                        <View style={styles.readout}>
                          <Text style={[type.data, { color: colors.text }]}>{t.confidence}</Text>
                          <Text style={[type.caption, { color: colors.textFaint }]}>/10</Text>
                        </View>
                        <Stepper value={t.confidence} onDec={() => setTopicConfidence(s.id, t.id, t.confidence - 1)} onInc={() => setTopicConfidence(s.id, t.id, t.confidence + 1)} />
                      </View>
                    ))}
                  </View>
                )}
              </Surface>
            );
          })}
        </View>

        {addable.length > 0 && (
          <>
            <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xl, marginBottom: spacing.sm }]}>ADD SUBJECT</Text>
            <View style={styles.addRow}>
              {addable.map((c) => (
                <PressableScale
                  key={c.id}
                  onPress={() => addSubject(c)}
                  style={[styles.addChip, { borderColor: colors.line2 }]}
                >
                  <Text style={[type.caption, { color: colors.text }]}>+ {c.name.toUpperCase()}</Text>
                </PressableScale>
              ))}
            </View>
          </>
        )}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  topicRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  readout: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: { width: 32, height: 32, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  addRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  addChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
});
