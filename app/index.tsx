import { Link, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius, subjectColors } from "../src/theme/tokens";
import { computePlan, sessionKeyOf, focusMinutesOn, studentModel } from "../src/state/model";
import { useStore } from "../src/state/store";
import { daysToNearestExam } from "../src/lib/buildWeek";
import { fmtHours, weekdayShort, fmtTime } from "../src/lib/format";
import { isLLMConfigured, planDeck } from "../src/lib/llm";
import { buildFallbackDeck, sanitizeDeck } from "../src/ui/deck";
import { CardDeck } from "../src/components/CardDeck";
import { OrbitRow } from "../src/components/OrbitRow";
import { Ridge } from "../src/components/Ridge";
import { CoachCard } from "../src/components/CoachCard";
import { Garden } from "../src/components/Garden";
import { PressableScale } from "../src/components/PressableScale";
import { FadeInView } from "../src/components/FadeInView";

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

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";

  const subjects = state.config.subjects;
  const nameById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects]);
  const plan = useMemo(() => computePlan(state), [state]);

  const orbitSubjects = useMemo(() =>
    subjects
      .map((s) => ({
        id: s.id, name: s.name,
        color: subjectColors[s.name] ?? colors.accent,
        daysToExam: daysToNearestExam(s.id, todayISO),
        coverage: undefined as number | undefined, // real coverage arrives in SP3
      }))
      .sort((a, b) => (a.daysToExam ?? 1e9) - (b.daysToExam ?? 1e9)),
    [subjects, todayISO, colors.accent]);
  const leadId = orbitSubjects[0]?.id;

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftISO(state.week.refDateISO, i)),
    [state.week.refDateISO]);
  // Momentum ridge is honest: real focus minutes logged per day, never planned totals.
  const perDay = weekDates.map((d) => focusMinutesOn(state, d));
  const totalMin = perDay.reduce((a, b) => a + b, 0);
  const todayIndex = Math.max(0, weekDates.indexOf(todayISO));

  const today = plan.sessions
    .filter((s) => s.date === todayISO)
    .sort((a, b) => a.interval.start - b.interval.start);
  const next = today.find((s) => state.sessionStatus[sessionKeyOf(s)] !== "done");

  // Deterministic fallback deck, bound to live state. Never empty, never throws.
  const fallbackDeck = buildFallbackDeck({
    hasToday: today.length > 0,
    hasSubjects: subjects.length > 0,
    generatedAt: now.toISOString(),
  });

  // AI-TUTOR DECK (SP4): the deterministic deck renders INSTANTLY (below); on
  // mount we ask the tutor to arrange today and quietly swap in its plan when it
  // arrives. Fail-safe — planDeck returns null offline/on error/timeout, so the
  // fallback simply stays. The student never waits on the network to see content.
  useEffect(() => {
    if (!isLLMConfigured()) return;
    let cancelled = false;
    planDeck(studentModel(state))
      .then((raw) => {
        if (!cancelled && raw != null) setDeck(sanitizeDeck(raw, new Date().toISOString(), fallbackDeck));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // Mount-only: arrange the deck once per Home visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The deck actually rendered is the tutor's cached plan, else the fallback.
  const deck = state.deck ?? fallbackDeck;

  const deterministicCoach = next
    ? `Next up is ${nameById[next.subjectId]}. Small steps — start the session and I'll track the rest.`
    : `Nothing scheduled right now. When you finish a session, tell me how it went and I'll adjust.`;
  const coachBody = deck.coachNote?.body ?? deterministicCoach;
  const coachWhy = deck.coachNote?.why;

  const slots = {
    coach_note: <CoachCard body={coachBody} why={coachWhy} />,
    orbits: <OrbitRow subjects={orbitSubjects} leadId={leadId} />,
    do_next: next ? (
      <PressableScale haptic="light" onPress={() => router.push("/timer")} style={[styles.doNext, { backgroundColor: colors.accent }]}>
        <View style={{ flex: 1 }}>
          <Text style={[type.caption, { color: "#fff", opacity: 0.85 }]}>DO NEXT</Text>
          <Text style={[type.headline, { color: "#fff", marginTop: 3 }]}>{nameById[next.subjectId]}</Text>
          <Text style={[type.footnote, { color: "#fff", opacity: 0.85 }]}>
            {fmtTime(next.interval.start)}–{fmtTime(next.interval.end)}
          </Text>
        </View>
        <Text style={{ color: "#fff", fontSize: 22 }}>→</Text>
      </PressableScale>
    ) : undefined,
    momentum_ridge: (
      <Ridge
        values={perDay}
        labels={weekDates.map((d) => weekdayShort(d)[0]!)}
        todayIndex={todayIndex}
        totalLabel={`${fmtHours(totalMin / 60)} focused`}
        subLabel="this week"
      />
    ),
    garden_peek: (
      <Garden
        plants={state.garden.slice(-12).map((p) => p.kind)}
        caption={state.garden.length ? `${state.garden.length} grown` : "grows as you focus"}
      />
    ),
    reflect_cta: (
      <PressableScale onPress={() => router.push("/reflect")} style={[styles.reflect, { borderColor: colors.separator }]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.accent, fontSize: 17 }}>🎙</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.callout, { color: colors.text, fontWeight: "700" }]}>Reflect on a session</Text>
          <Text style={[type.footnote, { color: colors.textDim }]}>Just talk — I'll sort out what you covered.</Text>
        </View>
      </PressableScale>
    ),
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.strip}>
          <Text style={[type.headline, { color: colors.text }]}>Reflow</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
              <Text style={[type.footnote, { color: colors.gold }]}>🔥 {state.progress.streakDays}</Text>
            </View>
            <Link href="/rewards" asChild>
              <Pressable>
                <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
                  <Text style={[type.footnote, { color: colors.gold, fontVariant: ["tabular-nums"] }]}>🪙 {state.progress.coins}</Text>
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.lg }]}>
          {weekdayShort(todayISO)} · {now.getDate()}
        </Text>
        <Text style={[type.hero, { color: colors.text, marginTop: spacing.xs, marginBottom: spacing.lg }]}>{greeting}</Text>

        <FadeInView>
          <CardDeck plan={deck} slots={slots} />
        </FadeInView>

        <PressableScale onPress={() => router.push("/tutor")} style={[styles.tutor, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.accent, fontSize: 16 }}>💬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.callout, { color: colors.text, fontWeight: "700" }]}>Tutor</Text>
            <Text style={[type.footnote, { color: colors.textDim }]}>Ask a question or think out loud.</Text>
          </View>
          <Text style={{ color: colors.textFaint, fontSize: 20 }}>→</Text>
        </PressableScale>

        <Link href="/setup" asChild>
          <Pressable><Text style={[type.footnote, { color: colors.textFaint, textAlign: "center", marginTop: spacing.xl }]}>Practice · Corrections · Library · Settings →</Text></Pressable>
        </Link>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 0 },
  strip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  doNext: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  reflect: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed" },
  tutor: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.lg },
});
