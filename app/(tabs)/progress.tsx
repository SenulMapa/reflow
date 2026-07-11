import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PressableScale } from "../../src/components/PressableScale";
import { DotField } from "../../src/components/DotField";
import { Hairline } from "../../src/components/Hairline";
import { ReadinessSection } from "../../src/components/ReadinessSection";
import { Garden } from "../../src/components/Garden";
import { WhySheet, type WhyData } from "../../src/components/WhySheet";
import { useTheme } from "../../src/theme/theme";
import { spacing, type, radius, bounded } from "../../src/theme/tokens";
import { useStore } from "../../src/state/store";
import { computePlan } from "../../src/state/model";
import { fmtHours } from "../../src/lib/format";
import type { SubjectReadiness } from "../../src/lib/readiness";

const shiftISO = (iso: string, d: number) => {
  const x = new Date(iso + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

/**
 * "How am I doing" — every reporting surface in one scroll (Fable IA). Readiness
 * leads (with the one weekly action: Log paper), then the reward/garden ambient,
 * then tap-throughs to the deep Insights + Rewards + Flashcards screens. Nothing
 * that *demands action* lives here — this tab is for reflection, Now is for doing.
 */
export default function Progress() {
  const { colors } = useTheme();
  const router = useRouter();
  const state = useStore((s) => s.state);
  const plan = useMemo(() => computePlan(state), [state]);
  const nameById = useMemo(
    () => Object.fromEntries(state.config.subjects.map((s) => [s.id, s.name])),
    [state.config.subjects],
  );
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftISO(state.week.refDateISO, i)),
    [state.week.refDateISO],
  );

  const [why, setWhy] = useState<WhyData | null>(null);
  const whyForReadiness = (r: SubjectReadiness) => {
    const name = nameById[r.subjectId] ?? r.subjectId;
    const lines = r.enough
      ? [
          `Ready ${Math.round((r.readiness ?? 0) * 100)}% — where your prep IS right now, not a predicted grade.`,
          `${r.papers} past paper${r.papers === 1 ? "" : "s"}${r.performance != null ? ` · avg ${Math.round(r.performance * 100)}%` : ""}.`,
          `${r.confidentTopics}/${r.totalTopics} topics confident.`,
          `${fmtHours(r.bankedHours)} / ${fmtHours(r.allocatedHours)} banked this week.`,
        ]
      : [
          "Not enough signal yet to read your readiness honestly.",
          "Log a past paper and the number appears — no fabricated grades.",
        ];
    setWhy({ title: `${name} readiness`, lines });
  };

  const links = [
    { href: "/metrics", label: "Insights", sub: "Confidence, performance, exam countdown" },
    { href: "/rewards", label: "Rewards", sub: "Coins, streaks and the shop" },
    { href: "/cards", label: "Flashcards", sub: "Spaced-repetition review queue" },
    { href: "/library", label: "Textbooks", sub: "Read & annotate your PDF sources" },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[type.caption, { color: colors.textDim }]}>PROGRESS</Text>
        <Text style={[type.largeTitle, { color: colors.text, marginTop: spacing.xs }]}>How you're doing</Text>

        {/* The one weekly action lives here (Fable flow c) — the sole red on the screen */}
        <PressableScale
          haptic="light"
          onPress={() => router.push("/metrics")}
          style={[styles.logCta, { borderColor: colors.line2 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[type.headline, { color: colors.text }]}>Log a past paper</Text>
            <Text style={[type.footnote, { color: colors.textDim, marginTop: 2 }]}>Moves your readiness — the honest number.</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        </PressableScale>

        <View style={{ marginTop: spacing.xl }}>
          <ReadinessSection state={state} plan={plan} weekDates={weekDates} onWhy={whyForReadiness} />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Garden
            plants={state.garden.slice(-18).map((p) => p.kind)}
            caption={state.garden.length ? `${state.garden.length} grown` : "grows as you focus"}
          />
        </View>

        <View style={{ marginTop: spacing.xxl }}>
          {links.map((r, i) => (
            <View key={r.href}>
              {i > 0 && <Hairline />}
              <PressableScale haptic="light" onPress={() => router.push(r.href)} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.headline, { color: colors.text }]}>{r.label}</Text>
                  <Text style={[type.footnote, { color: colors.textDim, marginTop: 2 }]}>{r.sub}</Text>
                </View>
                <Text style={[type.body, { color: colors.textFaint }]}>›</Text>
              </PressableScale>
            </View>
          ))}
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
      <WhySheet data={why} onClose={() => setWhy(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, ...bounded },
  logCta: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.card, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
});
