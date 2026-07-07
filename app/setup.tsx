import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { effectiveConfidence } from "../src/data/subjects";
import { fmtHours } from "../src/lib/format";

/** Subjects available to add (beyond whatever is already configured). */
const CATALOG = [
  { id: "cs", name: "Computer Science", confidence: 5 },
  { id: "chem", name: "Chemistry", confidence: 5 },
  { id: "bio", name: "Biology", confidence: 5 },
];

function Stepper({
  onDec,
  onInc,
  color,
}: {
  onDec: () => void;
  onInc: () => void;
  color: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onDec} hitSlop={8} style={[styles.stepBtn, { backgroundColor: color + "22" }]}>
        <Text style={[type.headline, { color }]}>−</Text>
      </Pressable>
      <Pressable onPress={onInc} hitSlop={8} style={[styles.stepBtn, { backgroundColor: color + "22" }]}>
        <Text style={[type.headline, { color }]}>＋</Text>
      </Pressable>
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Link href="/" asChild>
            <Pressable hitSlop={10}>
              <Text style={[type.headline, { color: colors.accent }]}>‹ Week</Text>
            </Pressable>
          </Link>
          <Pressable onPress={reset} hitSlop={10}>
            <Text style={[type.footnote, { color: colors.textDim }]}>Reset</Text>
          </Pressable>
        </View>
        <Text style={[type.largeTitle, { color: colors.text, marginBottom: spacing.lg }]}>Setup</Text>

        {/* Weekly goal */}
        <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>WEEKLY GOAL</Text>
        <Surface style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[type.headline, { color: colors.text }]}>{fmtHours(goal)} / week</Text>
            <Text style={[type.footnote, { color: colors.textDim }]}>Total study time to distribute</Text>
          </View>
          <Stepper color={colors.accent} onDec={() => setWeeklyGoal(goal - 1)} onInc={() => setWeeklyGoal(goal + 1)} />
        </Surface>

        <Link href="/availability" asChild>
          <Pressable>
            <Surface style={[styles.row, { marginTop: spacing.sm }]}>
              <Text style={[type.headline, { color: colors.text, flex: 1 }]}>Availability</Text>
              <Text style={[type.headline, { color: colors.accent }]}>Edit ›</Text>
            </Surface>
          </Pressable>
        </Link>

        <Link href="/sources" asChild>
          <Pressable>
            <Surface style={[styles.row, { marginTop: spacing.sm }]}>
              <Text style={[type.headline, { color: colors.text, flex: 1 }]}>Knowledge Base</Text>
              <Text style={[type.headline, { color: colors.accent }]}>Sources ›</Text>
            </Surface>
          </Pressable>
        </Link>

        {/* Subjects */}
        <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          SUBJECTS · confidence drives the split
        </Text>
        <View style={{ gap: spacing.sm }}>
          {state.config.subjects.map((s) => {
            const color = subjectColors[s.name] ?? colors.accent;
            const eff = effectiveConfidence(s);
            const hasTopics = !!s.topics && s.topics.length > 0;
            return (
              <Surface key={s.id} style={{ gap: spacing.md }}>
                <View style={styles.subjectRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.headline, { color: colors.text }]}>{s.name}</Text>
                    <Text style={[type.footnote, { color: colors.textDim }]}>
                      {hasTopics ? `avg confidence ${eff.toFixed(1)}/10` : `confidence ${s.confidence}/10`}
                    </Text>
                  </View>
                  {!hasTopics && (
                    <Stepper color={color} onDec={() => setConfidence(s.id, s.confidence - 1)} onInc={() => setConfidence(s.id, s.confidence + 1)} />
                  )}
                  <Pressable onPress={() => removeSubject(s.id)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
                    <Text style={[type.headline, { color: colors.textFaint }]}>✕</Text>
                  </Pressable>
                </View>

                {hasTopics &&
                  s.topics!.map((t) => (
                    <View key={t.id} style={styles.topicRow}>
                      <Text style={[type.callout, { color: colors.text, flex: 1 }]}>{t.name}</Text>
                      <View style={styles.confBar}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <View key={i} style={[styles.confSeg, { backgroundColor: i < t.confidence ? color : colors.separator }]} />
                        ))}
                      </View>
                      <Text style={[type.footnote, { color: colors.textDim, width: 34, textAlign: "right" }]}>{t.confidence}/10</Text>
                      <Stepper color={color} onDec={() => setTopicConfidence(s.id, t.id, t.confidence - 1)} onInc={() => setTopicConfidence(s.id, t.id, t.confidence + 1)} />
                    </View>
                  ))}
              </Surface>
            );
          })}
        </View>

        {addable.length > 0 && (
          <>
            <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xl, marginBottom: spacing.sm }]}>ADD SUBJECT</Text>
            <View style={styles.addRow}>
              {addable.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => addSubject(c)}
                  style={[styles.addChip, { backgroundColor: colors.accentSoft }]}
                >
                  <Text style={[type.footnote, { color: colors.accent, fontWeight: "600" }]}>＋ {c.name}</Text>
                </Pressable>
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
  topicRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  confBar: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: spacing.sm },
  confSeg: { width: 8, height: 6, borderRadius: 3 },
  stepper: { flexDirection: "row", gap: spacing.sm },
  stepBtn: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  addRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  addChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
});
