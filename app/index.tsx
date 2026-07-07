import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type } from "../src/theme/tokens";
import { DEMO_SUBJECTS } from "../src/data/subjects";
import { buildWeekInput, DEFAULT_AVAILABILITY } from "../src/lib/buildWeek";
import { planWeek, reflow, type WeekInput, type WeekPlan } from "../src/engine/week";
import type { PlacedSession } from "../src/engine/placer/types";
import { dayNum, fmtHours, fmtTime, weekdayShort } from "../src/lib/format";

const REF_DATE = "2027-04-25"; // demo week ~10 days before IAL exams
const NAME_BY_ID = Object.fromEntries(DEMO_SUBJECTS.map((s) => [s.id, s.name]));
const colorFor = (id: string) => subjectColors[NAME_BY_ID[id] ?? ""] ?? "#5E5CE6";

const minutes = (ss: PlacedSession[]) =>
  ss.reduce((t, s) => t + (s.interval.end - s.interval.start), 0);

function baseInput(): WeekInput {
  return buildWeekInput({
    refDateISO: REF_DATE,
    subjects: DEMO_SUBJECTS,
    availability: DEFAULT_AVAILABILITY,
    weeklyGoalHours: 24,
  });
}

export default function ThisWeek() {
  const { colors } = useTheme();
  const [input, setInput] = useState<WeekInput>(baseInput);
  const [plan, setPlan] = useState<WeekPlan>(() => planWeek(baseInput()));
  const [banner, setBanner] = useState<{ text: string; undo: () => void } | null>(null);

  const weekRange = useMemo(() => {
    const d0 = input.days[0]!.date;
    const d6 = input.days[6]!.date;
    return `${weekdayShort(d0)} ${dayNum(d0)} – ${weekdayShort(d6)} ${dayNum(d6)}`;
  }, [input]);

  const totalPlanned = minutes(plan.sessions);
  const unplaced = Object.entries(plan.unplacedHours).filter(([, h]) => h > 0.01);

  /** Demo: block a 2h chunk on the busiest day and watch the week rebalance. */
  function simulateBlock() {
    const perDay = new Map<string, number>();
    for (const s of plan.sessions) {
      perDay.set(s.date, (perDay.get(s.date) ?? 0) + (s.interval.end - s.interval.start));
    }
    const busiest = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!busiest) return;

    const dayIdx = input.days.findIndex((d) => d.date === busiest);
    const day = input.days[dayIdx]!;
    const win = day.availability[0]!;
    const blockStart = win.start;
    const block = { start: blockStart, end: Math.min(blockStart + 120, win.end) };

    const prevInput = input;
    const prevPlan = plan;
    const nextInput: WeekInput = {
      ...input,
      days: input.days.map((d, i) =>
        i === dayIdx ? { ...d, blocks: [...d.blocks, block] } : d
      ),
    };
    const { plan: nextPlan, diff } = reflow(prevPlan, nextInput);

    const movedH = fmtHours(minutes(diff.removed) / 60);
    const toDays = [...new Set(diff.added.map((s) => weekdayShort(s.date)))].join(", ");
    setInput(nextInput);
    setPlan(nextPlan);
    setBanner({
      text: `Blocked ${fmtTime(block.start)}–${fmtTime(block.end)} ${weekdayShort(busiest)} · moved ${movedH} → ${toDays || "elsewhere"}`,
      undo: () => {
        setInput(prevInput);
        setPlan(prevPlan);
        setBanner(null);
      },
    });
  }

  function reset() {
    const b = baseInput();
    setInput(b);
    setPlan(planWeek(b));
    setBanner(null);
  }

  const sessionsByDate = (date: string) =>
    plan.sessions
      .filter((s) => s.date === date)
      .sort((a, b) => a.interval.start - b.interval.start);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[type.footnote, { color: colors.accent, fontWeight: "700", letterSpacing: 1 }]}>
          THIS WEEK · {weekRange}
        </Text>
        <Text style={[type.largeTitle, { color: colors.text, marginTop: 2 }]}>Schedule</Text>
        <Text style={[type.callout, { color: colors.textDim, marginTop: 2 }]}>
          {fmtHours(totalPlanned / 60)} planned toward your {fmtHours(input.weeklyGoalHours)} goal
        </Text>

        {/* Allocation chips */}
        <View style={styles.chips}>
          {plan.allocations.map((a) => (
            <View key={a.subjectId} style={[styles.chip, { backgroundColor: colors.surface }]}>
              <View style={[styles.dot, { backgroundColor: colorFor(a.subjectId) }]} />
              <Text style={[type.footnote, { color: colors.text, fontWeight: "600" }]}>
                {NAME_BY_ID[a.subjectId]}
              </Text>
              <Text style={[type.footnote, { color: colors.textDim }]}>{fmtHours(a.hours)}</Text>
            </View>
          ))}
        </View>

        {/* Reflow demo controls */}
        <View style={styles.actions}>
          <Pressable
            onPress={simulateBlock}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[type.headline, { color: "#fff" }]}>Block busiest slot →</Text>
          </Pressable>
          <Pressable
            onPress={reset}
            style={({ pressed }) => [
              styles.btnGhost,
              { backgroundColor: colors.accentSoft, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[type.headline, { color: colors.accent }]}>Reset</Text>
          </Pressable>
        </View>

        {banner && (
          <Surface style={styles.banner}>
            <Text style={[type.footnote, { color: colors.text, flex: 1 }]}>{banner.text}</Text>
            <Pressable onPress={banner.undo} hitSlop={8}>
              <Text style={[type.headline, { color: colors.accent }]}>Undo</Text>
            </Pressable>
          </Surface>
        )}

        {unplaced.length > 0 && (
          <Surface style={{ marginTop: spacing.md, backgroundColor: colors.accentSoft }}>
            <Text style={[type.footnote, { color: colors.warning, fontWeight: "600" }]}>
              Couldn’t fit {unplaced.map(([id, h]) => `${fmtHours(h)} ${NAME_BY_ID[id]}`).join(", ")} this week.
            </Text>
          </Surface>
        )}

        {/* Days */}
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          {input.days.map((d) => {
            const ss = sessionsByDate(d.date);
            return (
              <Surface key={d.date} padded={false} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={[type.headline, { color: colors.text }]}>
                    {weekdayShort(d.date)} {dayNum(d.date)}
                  </Text>
                  <Text style={[type.footnote, { color: colors.textFaint }]}>
                    {ss.length ? fmtHours(minutes(ss) / 60) : "rest"}
                  </Text>
                </View>
                {ss.map((s, i) => (
                  <View
                    key={i}
                    style={[
                      styles.session,
                      { borderTopColor: colors.separator, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                    ]}
                  >
                    <View style={[styles.bar, { backgroundColor: colorFor(s.subjectId) }]} />
                    <Text style={[type.body, { color: colors.text, flex: 1 }]}>
                      {NAME_BY_ID[s.subjectId]}
                    </Text>
                    <Text style={[type.callout, { color: colors.textDim }]}>
                      {fmtTime(s.interval.start)} – {fmtTime(s.interval.end)}
                    </Text>
                  </View>
                ))}
              </Surface>
            );
          })}
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  dayCard: { overflow: "hidden" },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  session: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bar: { width: 4, height: 22, borderRadius: 2 },
});
