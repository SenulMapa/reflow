import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/theme";
import { spacing, type, radius, subjectColors, bounded } from "../../src/theme/tokens";
import {
  computePlan, sessionKeyOf, focusMinutesOn, studentModel,
  weakestTopic, unreviewedCorrections,
} from "../../src/state/model";
import type { PlacedSession } from "../../src/engine/placer/types";
import { useStore } from "../../src/state/store";
import { daysToNearestExam } from "../../src/lib/buildWeek";
import { weekdayShort, fmtTime } from "../../src/lib/format";
import { coverageOf } from "../../src/lib/readiness";
import { isLLMConfigured, planDeck } from "../../src/lib/llm";
import { buildFallbackDeck, sanitizeDeck } from "../../src/ui/deck";
import { NowBlock } from "../../src/components/NowBlock";
import { TodayStrip } from "../../src/components/TodayStrip";
import { WhySheet, type WhyData } from "../../src/components/WhySheet";
import { PressableScale } from "../../src/components/PressableScale";
import { FadeInView } from "../../src/components/FadeInView";
import { DotField } from "../../src/components/DotField";
import { AmbientStrip } from "../../src/components/AmbientStrip";
import { selectNowState } from "../../src/lib/nowBlock";

const shiftISO = (iso: string, d: number) => {
  const x = new Date(iso + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const state = useStore((s) => s.state);
  const setDeck = useStore((s) => s.setDeck);
  const markSessionDone = useStore((s) => s.markSessionDone);
  const setSessionStatus = useStore((s) => s.setSessionStatus);

  // The ONE new clock: re-tick every 30s so the Now-block advances (upcoming →
  // startingNow → inProgress → missed) without a remount. All logic stays clock-free.
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(iv);
  }, []);
  const todayISO = `${clock.getFullYear()}-${String(clock.getMonth() + 1).padStart(2, "0")}-${String(clock.getDate()).padStart(2, "0")}`;
  const nowMinutes = clock.getHours() * 60 + clock.getMinutes();
  const greeting = clock.getHours() < 12 ? "Good morning." : clock.getHours() < 18 ? "Good afternoon." : "Good evening.";

  const subjects = state.config.subjects;
  const nameById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects]);
  const plan = useMemo(() => computePlan(state), [state]);

  const focusedTodayMin = focusMinutesOn(state, todayISO);

  // Nearest exam across subjects — feeds the ambient countdown cue.
  const orbitSubjects = useMemo(() =>
    subjects
      .map((s) => ({
        id: s.id, name: s.name,
        color: subjectColors[s.name] ?? colors.accent,
        daysToExam: daysToNearestExam(s.id, todayISO),
        coverage: coverageOf(s),
      }))
      .sort((a, b) => (a.daysToExam ?? 1e9) - (b.daysToExam ?? 1e9)),
    [subjects, todayISO, colors.accent]);

  // Which session (if any) is live right now — highlights it in the Today strip.
  const now = selectNowState(plan.sessions, state.sessionStatus, todayISO, nowMinutes);
  const currentKey = now.session && (now.kind === "inProgress" || now.kind === "startingNow")
    ? sessionKeyOf(now.session) : undefined;

  // ── Coach note (the ONLY AI surface): deterministic text paints instantly; the
  // tutor's line quietly swaps in when it arrives. Never blocks the answer. ──
  const fallbackDeck = buildFallbackDeck({
    hasToday: plan.sessions.some((s) => s.date === todayISO),
    hasSubjects: subjects.length > 0,
    generatedAt: clock.toISOString(),
  });
  useEffect(() => {
    if (!isLLMConfigured()) return;
    let cancelled = false;
    planDeck(studentModel(state))
      .then((raw) => { if (!cancelled && raw != null) setDeck(sanitizeDeck(raw, new Date().toISOString(), fallbackDeck)); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const deck = state.deck ?? fallbackDeck;
  const coachBody = deck.coachNote?.body ?? "Put your data in, do the session I pick — I'll keep the plan honest.";

  // ── WhySheet (trust receipts) ──
  const [why, setWhy] = useState<WhyData | null>(null);
  const whyForSession = (s: PlacedSession) => {
    const alloc = plan.allocations.find((a) => a.subjectId === s.subjectId);
    const wt = weakestTopic(state, s.subjectId);
    const toReview = wt ? unreviewedCorrections(state, s.subjectId, wt.id) : 0;
    const paper = state.pastPapers.find((p) => p.subjectId === s.subjectId && p.weakChapters.length > 0);
    const lines = [
      `Scheduled ${fmtTime(s.interval.start)}–${fmtTime(s.interval.end)}.`,
      alloc?.rationale ? `Why ${nameById[s.subjectId]}: ${alloc.rationale}` : "",
      wt ? `Focus: ${wt.name} — your weakest topic (confidence ${wt.confidence}/10)${toReview ? `, ${toReview} correction${toReview === 1 ? "" : "s"} to review` : ""}.` : "",
      paper ? `Recent weak chapters: ${paper.weakChapters.join(", ")}.` : "",
    ].filter(Boolean);
    setWhy({ title: `Why ${nameById[s.subjectId]} now`, lines });
  };

  const startSession = (s: PlacedSession, mission: string) =>
    router.push({ pathname: "/timer", params: { sessionKey: sessionKeyOf(s), subjectId: s.subjectId, date: s.date, mission } });
  const toggleDone = (s: PlacedSession) => {
    const key = sessionKeyOf(s);
    if (state.sessionStatus[key] === "done") setSessionStatus(key, null);
    else markSessionDone(key, s.date);
  };

  const nearestExamDays = orbitSubjects.reduce(
    (m, o) => (o.daysToExam != null ? Math.min(m, o.daysToExam) : m),
    Infinity,
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header: wordmark + omnipresent Tutor / Settings glyphs (Fable IA) */}
        <View style={styles.strip}>
          <Text style={[type.title, { color: colors.text }]}>Reflow</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <PressableScale haptic="light" onPress={() => router.push("/tutor")} style={[styles.glyph, { borderColor: colors.line2 }]}>
              <Text style={[type.mono, { color: colors.text }]}>AI</Text>
            </PressableScale>
            <PressableScale haptic="light" onPress={() => router.push("/setup")} style={[styles.glyph, { borderColor: colors.line2 }]}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.display }} />
            </PressableScale>
          </View>
        </View>

        <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.lg }]}>
          {weekdayShort(todayISO)} · {clock.getDate()} · {greeting}
        </Text>

        {/* ZONE 1 — the hero: the app's answer to "what now". */}
        <FadeInView style={{ marginTop: spacing.md }}>
          <NowBlock
            state={state}
            plan={plan}
            nowISO={todayISO}
            nowMinutes={nowMinutes}
            focusedTodayMin={focusedTodayMin}
            onStart={startSession}
            onMarkDone={(s) => markSessionDone(sessionKeyOf(s), s.date)}
            onSkip={(s) => setSessionStatus(sessionKeyOf(s), "skipped")}
            onReflect={() => router.push("/reflect")}
            onSeeWeek={() => router.push("/week")}
            onSetup={() => router.push("/setup")}
            onWhy={whyForSession}
          />
        </FadeInView>

        {/* ZONE 2 — the one coach line. */}
        <View style={styles.coach}>
          <Text style={[type.caption, { color: colors.textFaint, marginBottom: 4 }]}>COACH</Text>
          <Text style={[type.footnote, { color: colors.textDim }]} numberOfLines={2}>{coachBody}</Text>
        </View>

        {/* ZONE 3 — today, compressed. */}
        <TodayStrip state={state} plan={plan} nowISO={todayISO} currentKey={currentKey}
          onToggle={toggleDone} onOpenWeek={() => router.push("/week")} />

        {/* ZONE 4 — ambient cue (streak · garden · countdown) → Progress. */}
        <AmbientStrip
          streakDays={state.progress.streakDays}
          plantsGrown={state.garden.length}
          daysToExam={Number.isFinite(nearestExamDays) ? nearestExamDays : null}
          onPress={() => router.push("/progress")}
        />

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      <WhySheet data={why} onClose={() => setWhy(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 0, ...bounded },
  strip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  glyph: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  coach: { marginTop: spacing.lg, minHeight: 40, justifyContent: "center" },
});
