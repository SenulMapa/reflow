import { useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { Pill } from "../src/components/Pill";
import { Hairline } from "../src/components/Hairline";
import { DotField } from "../src/components/DotField";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { generate, isLLMConfigured } from "../src/lib/llm";

interface PerPoint { point: string; hit: boolean; evidence: string }
interface GradeResp { awarded: number; maxMarks: number; perPoint: PerPoint[]; missed: string[]; examinerTip: string }

const todayISO = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * AI mark-scheme grading (Fable feature 1.2) — the examiner in your pocket. Paste
 * a question + its mark scheme + your written answer; an IAL-examiner LLM marks it
 * point-by-point. Missed points feed straight into the corrections booklet, closing
 * the weakness loop. Offline: the mark scheme still shows as a self-mark checklist.
 */
export default function Grade() {
  const { colors } = useTheme();
  const router = useRouter();
  const subjects = useStore((s) => s.state.config.subjects);
  const addCorrection = useStore((s) => s.addCorrection);

  const [question, setQuestion] = useState("");
  const [markScheme, setMarkScheme] = useState("");
  const [maxMarks, setMaxMarks] = useState("6");
  const [answer, setAnswer] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGrade = question.trim() && markScheme.trim() && answer.trim();

  async function grade() {
    if (!canGrade) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await generate<GradeResp>("grade_answer", {
        question, markScheme, maxMarks: Number(maxMarks) || 0, answer, commandWord: firstWord(question),
      });
      if (typeof r?.awarded !== "number") throw new Error("No marks returned");
      setResult(r);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  function logMissed(point: string) {
    addCorrection({ id: `${Date.now()}`, subjectId, mistake: question, fix: point, date: todayISO(), reviewed: false });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[type.body, { color: colors.textDim }]}>‹ Back</Text>
          </Pressable>
          <Text style={[type.caption, { color: colors.textDim }]}>MARK MY ANSWER</Text>
        </View>

        {!result && (
          <>
            <Field label="QUESTION" value={question} onChange={setQuestion} placeholder="Paste the exam question…" colors={colors} />
            <Field label="MARK SCHEME" value={markScheme} onChange={setMarkScheme} placeholder="Paste the mark scheme / points…" colors={colors} tall />
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg, alignItems: "center" }}>
              <Text style={[type.caption, { color: colors.textDim }]}>MAX MARKS</Text>
              <TextInput value={maxMarks} onChangeText={setMaxMarks} keyboardType="number-pad"
                style={[type.data, styles.marks, { color: colors.text, borderColor: colors.line2 }]} />
            </View>
            <Field label="YOUR ANSWER" value={answer} onChange={setAnswer} placeholder="Write your answer…" colors={colors} tall />

            <View style={styles.pickRow}>
              {subjects.map((s) => {
                const active = subjectId === s.id;
                return (
                  <Pressable key={s.id} onPress={() => setSubjectId(s.id)}
                    style={[styles.pick, { borderColor: colors.line2, backgroundColor: active ? colors.display : "transparent" }]}>
                    <Text style={[type.caption, { color: active ? colors.bg : colors.text }]}>{s.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: spacing.xl }}>
              <Pill label={isLLMConfigured() ? "Mark my answer" : "Connect server to grade"} disabled={!canGrade || loading || !isLLMConfigured()} onPress={grade} />
            </View>
            {loading && <ActivityIndicator color={colors.text} style={{ marginTop: spacing.lg }} />}
            {error && <Text style={[type.footnote, { color: colors.textDim, marginTop: spacing.md }]}>Couldn’t reach the examiner: {error}</Text>}
          </>
        )}

        {result && (
          <>
            <View style={{ alignItems: "center", marginTop: spacing.xl }}>
              <Text style={[type.numeralHero, { color: colors.display }]}>{result.awarded}</Text>
              <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xs }]}>OF {result.maxMarks} MARKS</Text>
            </View>

            <Surface style={{ marginTop: spacing.xl, gap: spacing.md }}>
              {result.perPoint?.map((p, i) => (
                <View key={i} style={{ gap: 4 }}>
                  {i > 0 && <Hairline />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: i > 0 ? spacing.md : 0 }}>
                    <Text style={[type.mono, { color: p.hit ? colors.success : colors.textFaint }]}>{p.hit ? "✓" : "✗"}</Text>
                    <Text style={[type.callout, { color: colors.text, flex: 1 }]}>{p.point}</Text>
                  </View>
                  {p.evidence ? <Text style={[type.footnote, { color: colors.textDim, marginLeft: 22 }]}>{p.evidence}</Text> : null}
                </View>
              ))}
            </Surface>

            {result.missed?.length > 0 && (
              <View style={{ marginTop: spacing.xl }}>
                <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.md }]}>MISSED — TAP TO LOG A CORRECTION</Text>
                {result.missed.map((m, i) => (
                  <Pressable key={i} onPress={() => logMissed(m)} style={[styles.missed, { borderColor: colors.line2 }]}>
                    <Text style={[type.footnote, { color: colors.text, flex: 1 }]}>{m}</Text>
                    <Text style={[type.mono, { color: colors.textDim }]}>＋</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {result.examinerTip ? (
              <Surface style={{ marginTop: spacing.xl }}>
                <Text style={[type.caption, { color: colors.textFaint, marginBottom: 4 }]}>EXAMINER TIP</Text>
                <Text style={[type.footnote, { color: colors.textDim }]}>{result.examinerTip}</Text>
              </Surface>
            ) : null}

            <View style={{ marginTop: spacing.xl }}>
              <Pill label="Mark another" tone="outline" onPress={() => { setResult(null); setAnswer(""); }} />
            </View>
          </>
        )}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function firstWord(q: string): string {
  return q.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

function Field({ label, value, onChange, placeholder, colors, tall }: {
  label: string; value: string; onChange: (t: string) => void; placeholder: string; colors: any; tall?: boolean;
}) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textFaint}
        multiline
        style={[type.body, { color: colors.text, borderColor: colors.separator, borderWidth: 1, borderRadius: radius.card, padding: spacing.md, minHeight: tall ? 100 : 56, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, ...bounded },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  marks: { borderWidth: 1, borderRadius: radius.chip, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: 56, textAlign: "center" },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  missed: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, marginBottom: spacing.sm },
});
