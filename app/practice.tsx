import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { generate, isLLMConfigured } from "../src/lib/llm";

type Mode = "quiz" | "feynman";
interface QuizResp { questions: { q: string; answer: string; markscheme: string }[] }
interface FeynmanResp { score: number; gaps: string[]; feedback: string }

export default function Practice() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const addCorrection = useStore((s) => s.addCorrection);

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
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
    finally { setLoading(false); }
  }

  function logMistake(q: string, markscheme: string) {
    addCorrection({ id: `${Date.now()}`, subjectId, topicId, mistake: q, fix: markscheme, date: today(), reviewed: false });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Link href="/" asChild><Pressable hitSlop={10}><Text style={[type.headline, { color: colors.accent }]}>‹ Week</Text></Pressable></Link>
        <Text style={[type.largeTitle, { color: colors.text }]}>Practice</Text>

        {!configured && (
          <Surface style={{ marginTop: spacing.md, backgroundColor: colors.accentSoft }}>
            <Text style={[type.footnote, { color: colors.textDim }]}>
              AI practice needs your server connected (set EXPO_PUBLIC_LLM_URL). Everything else works offline.
            </Text>
          </Surface>
        )}

        {/* Mode toggle */}
        <View style={styles.tabs}>
          {(["quiz", "feynman"] as Mode[]).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, { backgroundColor: mode === m ? colors.accent : colors.surface }]}>
              <Text style={[type.headline, { color: mode === m ? "#fff" : colors.textDim }]}>{m === "quiz" ? "Quiz me" : "Explain it back"}</Text>
            </Pressable>
          ))}
        </View>

        {/* Subject + topic pickers */}
        <View style={[styles.pickRow, { marginTop: spacing.md }]}>
          {subjects.map((s) => (
            <Pressable key={s.id} onPress={() => { setSubjectId(s.id); setTopicId(s.topics?.[0]?.id); }} style={[styles.pick, { backgroundColor: subjectId === s.id ? (subjectColors[s.name] ?? colors.accent) : colors.accentSoft }]}>
              <Text style={[type.footnote, { color: subjectId === s.id ? "#fff" : colors.accent, fontWeight: "600" }]}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
        {subject?.topics && subject.topics.length > 0 && (
          <View style={[styles.pickRow, { marginTop: spacing.sm }]}>
            {subject.topics.map((t) => (
              <Pressable key={t.id} onPress={() => setTopicId(t.id)} style={[styles.pickSm, { backgroundColor: topicId === t.id ? colors.accent : colors.surface, borderColor: colors.separator, borderWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[type.caption, { color: topicId === t.id ? "#fff" : colors.textDim }]}>{t.name}</Text>
              </Pressable>
            ))}
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
          style={[styles.go, { backgroundColor: configured ? colors.accent : colors.textFaint, opacity: loading ? 0.7 : 1 }]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[type.headline, { color: "#fff" }]}>{mode === "quiz" ? "Generate questions" : "Grade my explanation"}</Text>}
        </Pressable>

        {error && (
          <Surface style={{ marginTop: spacing.md }}>
            <Text style={[type.footnote, { color: colors.danger }]}>Couldn’t reach the tutor: {error}</Text>
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
                      <Text style={[type.callout, { color: colors.success }]}>{q.answer}</Text>
                      <Text style={[type.footnote, { color: colors.textDim }]}>Mark scheme: {q.markscheme}</Text>
                      <View style={styles.qActions}>
                        <Pressable onPress={() => logMistake(q.q, q.markscheme)} hitSlop={6}>
                          <Text style={[type.footnote, { color: colors.accent, fontWeight: "600" }]}>+ I got this wrong → booklet</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <Pressable onPress={() => setRevealed(new Set(revealed).add(i))} hitSlop={6}>
                      <Text style={[type.footnote, { color: colors.accent, fontWeight: "600" }]}>Reveal answer</Text>
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
            <Text style={[type.largeTitle, { color: feynman.score >= 7 ? colors.success : feynman.score >= 4 ? colors.warning : colors.danger }]}>{feynman.score}/10</Text>
            {feynman.gaps?.length > 0 && (
              <>
                <Text style={[type.caption, { color: colors.textDim }]}>GAPS</Text>
                {feynman.gaps.map((g, i) => (
                  <Text key={i} style={[type.footnote, { color: colors.text }]}>• {g}</Text>
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
  tab: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  pickSm: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  explain: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, minHeight: 90, marginTop: spacing.md, textAlignVertical: "top" },
  go: { marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center", justifyContent: "center", minHeight: 50 },
  qActions: { flexDirection: "row", justifyContent: "flex-end" },
});
