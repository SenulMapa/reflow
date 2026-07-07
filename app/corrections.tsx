import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type } from "../src/theme/tokens";
import { useStore } from "../src/state/store";

export default function Corrections() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const addCorrection = useStore((s) => s.addCorrection);
  const toggleReviewed = useStore((s) => s.toggleCorrectionReviewed);
  const removeCorrection = useStore((s) => s.removeCorrection);

  const subjects = state.config.subjects;
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string | undefined>(subjects[0]?.topics?.[0]?.id);
  const [mistake, setMistake] = useState("");
  const [fix, setFix] = useState("");

  const subject = subjects.find((s) => s.id === subjectId);
  const nameById = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const topicName = (sid: string, tid?: string) =>
    subjects.find((s) => s.id === sid)?.topics?.find((t) => t.id === tid)?.name;

  function save() {
    if (!mistake.trim() || !subjectId) return;
    const now = new Date();
    const p = (n: number) => n.toString().padStart(2, "0");
    addCorrection({
      id: `${now.getTime()}`,
      subjectId,
      topicId,
      mistake: mistake.trim(),
      fix: fix.trim(),
      date: `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`,
      reviewed: false,
    });
    setMistake("");
    setFix("");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/" asChild>
          <Pressable hitSlop={10}>
            <Text style={[type.headline, { color: colors.accent }]}>‹ Week</Text>
          </Pressable>
        </Link>
        <Text style={[type.largeTitle, { color: colors.text }]}>Correction Booklet</Text>
        <Text style={[type.callout, { color: colors.textDim, marginBottom: spacing.lg }]}>
          Log a mistake → its topic gets weaker → next week bends toward it.
        </Text>

        {/* New entry */}
        <Surface style={{ gap: spacing.md }}>
          <View style={styles.pickRow}>
            {subjects.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSubjectId(s.id);
                  setTopicId(s.topics?.[0]?.id);
                }}
                style={[
                  styles.pick,
                  { backgroundColor: subjectId === s.id ? (subjectColors[s.name] ?? colors.accent) : colors.accentSoft },
                ]}
              >
                <Text style={[type.footnote, { color: subjectId === s.id ? "#fff" : colors.accent, fontWeight: "600" }]}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {subject?.topics && subject.topics.length > 0 && (
            <View style={styles.pickRow}>
              {subject.topics.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTopicId(t.id)}
                  style={[styles.pickSm, { backgroundColor: topicId === t.id ? colors.accent : colors.surface, borderColor: colors.separator, borderWidth: StyleSheet.hairlineWidth }]}
                >
                  <Text style={[type.caption, { color: topicId === t.id ? "#fff" : colors.textDim }]}>{t.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <TextInput
            value={mistake}
            onChangeText={setMistake}
            placeholder="What went wrong?"
            placeholderTextColor={colors.textFaint}
            style={[type.body, styles.input, { color: colors.text, borderColor: colors.separator }]}
            multiline
          />
          <TextInput
            value={fix}
            onChangeText={setFix}
            placeholder="The fix / mark-scheme point"
            placeholderTextColor={colors.textFaint}
            style={[type.body, styles.input, { color: colors.text, borderColor: colors.separator }]}
            multiline
          />
          <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: colors.accent }]}>
            <Text style={[type.headline, { color: "#fff" }]}>Log correction</Text>
          </Pressable>
        </Surface>

        {/* List */}
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          {state.corrections.length === 0 && (
            <Text style={[type.callout, { color: colors.textFaint, textAlign: "center", marginTop: spacing.xl }]}>
              No corrections yet. Every mistake you log makes the schedule smarter.
            </Text>
          )}
          {state.corrections.map((c) => (
            <Surface key={c.id} style={{ gap: spacing.sm }}>
              <View style={styles.cardHead}>
                <Text style={[type.footnote, { color: subjectColors[nameById[c.subjectId] ?? ""] ?? colors.accent, fontWeight: "700" }]}>
                  {nameById[c.subjectId]}{topicName(c.subjectId, c.topicId) ? ` · ${topicName(c.subjectId, c.topicId)}` : ""}
                </Text>
                <Text style={[type.caption, { color: colors.textFaint }]}>{c.date}</Text>
              </View>
              <Text style={[type.body, { color: colors.text }]}>{c.mistake}</Text>
              {!!c.fix && <Text style={[type.callout, { color: colors.success }]}>✓ {c.fix}</Text>}
              <View style={styles.cardActions}>
                <Pressable onPress={() => toggleReviewed(c.id)} hitSlop={6}>
                  <Text style={[type.footnote, { color: c.reviewed ? colors.success : colors.accent, fontWeight: "600" }]}>
                    {c.reviewed ? "✓ Reviewed" : "Mark reviewed"}
                  </Text>
                </Pressable>
                <Pressable onPress={() => removeCorrection(c.id)} hitSlop={6}>
                  <Text style={[type.footnote, { color: colors.textFaint }]}>Delete</Text>
                </Pressable>
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
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  pickSm: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, minHeight: 44 },
  saveBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardActions: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
});
