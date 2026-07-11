import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../../src/components/Surface";
import { DotField } from "../../src/components/DotField";
import { SegmentedBar } from "../../src/components/SegmentedBar";
import { useTheme } from "../../src/theme/theme";
import { radius, spacing, type } from "../../src/theme/tokens";
import { useStore } from "../../src/state/store";
import { generate, isLLMConfigured } from "../../src/lib/llm";

type Mode = "quiz" | "feynman";
interface QuizResp { questions: { q: string; answer: string; markscheme: string }[] }
interface FeynmanResp { score: number; gaps: string[]; feedback: string }

export default function Practice() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const addCorrection = useStore((s) => s.addCorrection);
  const applyFeynmanConfidence = useStore((s) => s.applyFeynmanConfidence);

  const subjects = state.config.subjects;
  const [mode, setMode] = useState<Mode>("quiz");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string | undefined>(subjects[0]?.topics?.[0]?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizResp | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [explanation, setExplanation] = useState("");
  const [feynman, setFeynman] = useState<FeynmanResp | null>(null);

  const subject = subjects.find((s) => s.id === subjectId);
  const topicName = subject?.topics?.find((t) => t.id === topicId)?.name;
  const configured = isLLMConfigured();

  const today = () => {
    const d = new Date();
    const p = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  async function runQuiz() {
    setLoading(true); setError(null); setQuiz(null); setRevealed(new Set());
    try {
      const r = await generate<QuizResp>("quiz", { subject: subject?.name, topic: topicName, count: 3 });
      if (!r?.questions?.length) throw new Error("No questions returned");
      setQuiz(r);
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
    finally { setLoading(false); }
  }

  async function runFeynman() {
    if (!explanation.trim()) return;
    setLoading(true); setError(null); setFeynman(null);
    try {
      const r = await generate<FeynmanResp>("grade_feynman", { topic: topicName ?? subject?.name, explanation });
      setFeynman(r);
      // Auto signal loop: the grade nudges this topic's confidence, feeding the
      // allocator + readiness — studying IS the data entry, no manual tweaking.
      if (typeof r?.score === "number" && topicId) applyFeynmanConfidence(subjectId, topicId, r.score);
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
    finally { setLoading(false); }
  }

  function logMistake(q: string, markscheme: string) {
    addCorrection({ id: `${Date.now()}`, subjectId, topicId, mistake: q, fix: markscheme, date: today(), reviewed: false });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[type.largeTitle, { color: colors.text }]}>Practice</Text>

        {!configured && (
          <Surface style={{ marginTop: spacing.md }}>
            <Text style={[type.footnote, { color: colors.textDim }]}>
              AI practice needs your server connected (set EXPO_PUBLIC_LLM_URL). Everything else works offline.
            </Text>
          </Surface>
        )}

        {/* Mode toggle */}
        <View style={styles.tabs}>
          {(["quiz", "feynman"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, { backgroundColor: active ? colors.display : "transparent", borderColor: colors.line2 }]}>
                <Text style={[type.mono, { color: active ? colors.bg : colors.textDim }]}>{m === "quiz" ? "QUIZ ME" : "EXPLAIN IT BACK"}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Subject + topic pickers */}
        <View style={[styles.pickRow, { marginTop: spacing.md }]}>
          {subjects.map((s) => {
            const active = subjectId === s.id;
            return (
              <Pressable key={s.id} onPress={() => { setSubjectId(s.id); setTopicId(s.topics?.[0]?.id); }} style={[styles.pick, { backgroundColor: active ? colors.display : "transparent", borderColor: colors.line2 }]}>
                <Text style={[type.caption, { color: active ? colors.bg : colors.text }]}>{s.name}</Text>
              </Pressable>
            );
          })}
        </View>
        {subject?.topics && subject.topics.length > 0 && (
          <View style={[styles.pickRow, { marginTop: spacing.sm }]}>
            {subject.topics.map((t) => {
              const active = topicId === t.id;
              return (
                <Pressable key={t.id} onPress={() => setTopicId(t.id)} style={[styles.pickSm, { backgroundColor: active ? colors.display : "transparent", borderColor: colors.line2 }]}>
                  <Text style={[type.caption, { color: active ? colors.bg : colors.textDim }]}>{t.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {mode === "feynman" && (
          <TextInput
            value={explanation}
            onChangeText={setExplanation}
            placeholder={`Explain ${topicName ?? "this topic"} in your own words…`}
            placeholderTextColor={colors.textFaint}
            multiline
            style={[type.body, styles.explain, { color: colors.text, borderColor: colors.separator }]}
          />
        )}

        <Pressable
          disabled={loading || !configured}
          onPress={mode === "quiz" ? runQuiz : runFeynman}
          style={[styles.go, { backgroundColor: configured ? colors.display : colors.raised, opacity: loading ? 0.7 : 1 }]}
        >
          {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={[type.mono, { color: configured ? colors.bg : colors.textFaint }]}>{mode === "quiz" ? "GENERATE QUESTIONS" : "GRADE MY EXPLANATION"}</Text>}
        </Pressable>

        {error && (
          <Surface style={{ marginTop: spacing.md, borderColor: colors.accentText }}>
            <Text style={[type.footnote, { color: colors.accentText }]}>Couldn’t reach the tutor: {error}</Text>
          </Surface>
        )}

        {/* Quiz results */}
        {mode === "quiz" && quiz && (
          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            {quiz.questions.map((q, i) => {
              const open = revealed.has(i);
              return (
                <Surface key={i} style={{ gap: spacing.sm }}>
                  <Text style={[type.body, { color: colors.text }]}>{i + 1}. {q.q}</Text>
                  {open ? (
                    <>
                      <Text style={[type.callout, { color: colors.text }]}>{q.answer}</Text>
                      <Text style={[type.footnote, { color: colors.textDim }]}>Mark scheme: {q.markscheme}</Text>
                      <View style={styles.qActions}>
                        <Pressable onPress={() => logMistake(q.q, q.markscheme)} hitSlop={6}>
                          <Text style={[type.caption, { color: colors.text }]}>+ WRONG → BOOKLET</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <Pressable onPress={() => setRevealed(new Set(revealed).add(i))} hitSlop={6}>
                      <Text style={[type.caption, { color: colors.text }]}>REVEAL ANSWER</Text>
                    </Pressable>
                  )}
                </Surface>
              );
            })}
          </View>
        )}

        {/* Feynman result */}
        {mode === "feynman" && feynman && (
          <Surface style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <View style={styles.scoreRow}>
              <Text style={[type.numeral, { color: feynman.score >= 7 ? colors.text : feynman.score >= 4 ? colors.textDim : colors.accentText }]}>{feynman.score}</Text>
              <Text style={[type.mono, { color: colors.textFaint }]}>/10</Text>
            </View>
            <SegmentedBar value={feynman.score} total={10} />
            {feynman.gaps?.length > 0 && (
              <>
                <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xs }]}>GAPS</Text>
                {feynman.gaps.map((g, i) => (
                  <Text key={i} style={[type.footnote, { color: colors.text }]}>— {g}</Text>
                ))}
              </>
            )}
            <Text style={[type.footnote, { color: colors.textDim, marginTop: spacing.xs }]}>{feynman.feedback}</Text>
          </Surface>
        )}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  tabs: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  tab: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, borderWidth: 1, alignItems: "center" },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  pickSm: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  explain: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, padding: spacing.md, minHeight: 90, marginTop: spacing.md, textAlignVertical: "top" },
  go: { marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", minHeight: 50 },
  qActions: { flexDirection: "row", justifyContent: "flex-end" },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
});
