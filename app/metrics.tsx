import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { Pill } from "../src/components/Pill";
import { DotField } from "../src/components/DotField";
import { SegmentedBar } from "../src/components/SegmentedBar";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { computePlan, subjectPerformance } from "../src/state/model";
import { effectiveConfidence } from "../src/data/subjects";
import { forecastSubject } from "../src/engine/forecast";
import { daysToNearestExam } from "../src/lib/buildWeek";
import { fmtHours } from "../src/lib/format";

export default function Metrics() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const addPastPaper = useStore((s) => s.addPastPaper);
  const removePastPaper = useStore((s) => s.removePastPaper);

  const subjects = state.config.subjects;
  const nameById = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const plan = useMemo(() => computePlan(state), [state]);
  const hoursFor = (id: string) => plan.allocations.find((a) => a.subjectId === id)?.hours ?? 0;

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [year, setYear] = useState("2024");
  const [month, setMonth] = useState("May");
  const [variant, setVariant] = useState("");
  const [score, setScore] = useState("");

  function save() {
    if (!subjectId) return;
    const now = new Date();
    const p = (n: number) => n.toString().padStart(2, "0");
    addPastPaper({
      id: `${now.getTime()}`,
      subjectId,
      year: parseInt(year, 10) || now.getFullYear(),
      month: month.trim() || "May",
      variant: variant.trim(),
      scorePct: score.trim() === "" ? null : Math.max(0, Math.min(100, parseInt(score, 10) || 0)),
      weakChapters: [],
      date: `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`,
    });
    setVariant("");
    setScore("");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/" asChild>
          <Pressable hitSlop={10}>
            <Text style={[type.caption, { color: colors.textDim }]}>‹ WEEK</Text>
          </Pressable>
        </Link>
        <Text style={[type.largeTitle, { color: colors.text, marginBottom: spacing.lg }]}>Insights</Text>

        {/* Per-subject metrics */}
        <View style={{ gap: spacing.sm }}>
          {subjects.map((s) => {
            const perf = subjectPerformance(state, s.id);
            const dte = daysToNearestExam(s.id, state.week.refDateISO);
            const conf = effectiveConfidence(s);
            const scored = state.pastPapers
              .filter((p) => p.subjectId === s.id && p.scorePct != null)
              .map((p) => ({ scorePct: p.scorePct as number, date: p.date }));
            const fc = forecastSubject(scored, null);
            const trendStr =
              fc.dataStrength === "none" || fc.slopePerWeek == null
                ? "—"
                : `${fc.trend === "up" ? "↑" : fc.trend === "down" ? "↓" : "→"} ${fc.slopePerWeek > 0 ? "+" : ""}${fc.slopePerWeek}/wk`;
            return (
              <Surface key={s.id} style={{ gap: spacing.md }}>
                <View style={styles.cardHead}>
                  <Text style={[type.mono, { color: colors.text }]}>{s.name.toUpperCase()}</Text>
                  <Text style={[type.data, { color: colors.text }]}>{fmtHours(hoursFor(s.id))}</Text>
                </View>
                <View style={{ gap: spacing.xs }}>
                  <View style={styles.cardHead}>
                    <Text style={[type.caption, { color: colors.textDim }]}>Confidence</Text>
                    <Text style={[type.data, { color: colors.text }]}>{conf.toFixed(1)}/10</Text>
                  </View>
                  <SegmentedBar value={conf} total={10} />
                </View>
                <View style={styles.metricsRow}>
                  <Metric label="Past papers" value={perf == null ? "—" : `${Math.round(perf * 100)}%`} colors={colors} />
                  <Metric label="Trend" value={trendStr} colors={colors} />
                  <Metric label="Next exam" value={dte == null ? "—" : `${dte}d`} colors={colors} />
                </View>
              </Surface>
            );
          })}
        </View>

        {/* Add past paper */}
        <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          LOG A PAST PAPER
        </Text>
        <Surface style={{ gap: spacing.md }}>
          <View style={styles.pickRow}>
            {subjects.map((s) => {
              const active = subjectId === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSubjectId(s.id)}
                  style={[styles.pick, { backgroundColor: active ? colors.display : "transparent", borderColor: colors.line2 }]}
                >
                  <Text style={[type.caption, { color: active ? colors.bg : colors.text }]}>{s.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.formRow}>
            <Field label="Year" value={year} onChange={setYear} colors={colors} keyboard="number-pad" />
            <Field label="Month" value={month} onChange={setMonth} colors={colors} />
          </View>
          <View style={styles.formRow}>
            <Field label="Variant" value={variant} onChange={setVariant} colors={colors} placeholder="WMA11/01" />
            <Field label="Score %" value={score} onChange={setScore} colors={colors} keyboard="number-pad" placeholder="72" />
          </View>
          <Pill label="Add paper" onPress={save} />
        </Surface>

        {/* Paper list */}
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {state.pastPapers.map((p) => (
            <Surface key={p.id} style={styles.paperRow}>
              <View style={{ flex: 1 }}>
                <Text style={[type.mono, { color: colors.text }]}>
                  {(nameById[p.subjectId] ?? "").toUpperCase()} · {p.month.toUpperCase()} {p.year}{p.variant ? ` · ${p.variant}` : ""}
                </Text>
              </View>
              <Text style={[type.data, { color: scoreColor(p.scorePct, colors) }]}>
                {p.scorePct == null ? "—" : `${p.scorePct}%`}
              </Text>
              <Pressable onPress={() => removePastPaper(p.id)} hitSlop={6} style={{ marginLeft: spacing.md }}>
                <Text style={[type.footnote, { color: colors.textFaint }]}>✕</Text>
              </Pressable>
            </Surface>
          ))}
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function scoreColor(pct: number | null, colors: { text: string; textDim: string; textFaint: string }) {
  if (pct == null) return colors.textFaint;
  if (pct >= 70) return colors.text;
  return colors.textDim;
}

function Metric({ label, value, colors }: { label: string; value: string; colors: { textDim: string; text: string } }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[type.caption, { color: colors.textDim }]}>{label}</Text>
      <Text style={[type.data, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Field({
  label, value, onChange, colors, keyboard, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: { textDim: string; text: string; separator: string; textFaint: string };
  keyboard?: "number-pad";
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[type.caption, { color: colors.textDim, marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={[type.body, styles.field, { color: colors.text, borderColor: colors.separator }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, ...bounded },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricsRow: { flexDirection: "row", gap: spacing.md },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  formRow: { flexDirection: "row", gap: spacing.md },
  field: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  paperRow: { flexDirection: "row", alignItems: "center" },
});
