import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type } from "../src/theme/tokens";
import { computePlan, sessionKeyOf } from "../src/state/model";
import { levelProgress } from "../src/state/rewards";
import { useStore } from "../src/state/store";
import { daysToNearestExam } from "../src/lib/buildWeek";
import { daysAway } from "../src/lib/words";
import { fmtHours, fmtTime, weekdayShort } from "../src/lib/format";

const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shiftISO = (iso: string, d: number) => {
  const x = new Date(iso + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

export default function Home() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const markSessionDone = useStore((s) => s.markSessionDone);
  const [flash, setFlash] = useState<string | null>(null);

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";

  const subjects = state.config.subjects;
  const nameById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects]);
  const plan = useMemo(() => computePlan(state), [state]);

  const nearest = useMemo(() => {
    const list = subjects
      .map((s) => ({ id: s.id, name: s.name, days: daysToNearestExam(s.id, todayISO) }))
      .filter((e): e is { id: string; name: string; days: number } => e.days != null)
      .sort((a, b) => a.days - b.days);
    return list[0];
  }, [subjects, todayISO]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftISO(state.week.refDateISO, i)),
    [state.week.refDateISO]
  );
  const perDay = weekDates.map((d) =>
    plan.sessions.filter((s) => s.date === d).reduce((t, s) => t + (s.interval.end - s.interval.start), 0)
  );
  const totalMin = perDay.reduce((a, b) => a + b, 0);
  const goalMin = state.config.weeklyGoalHours * 60;
  const maxDay = Math.max(60, ...perDay);
  const doneCount = plan.sessions.filter((s) => state.sessionStatus[sessionKeyOf(s)] === "done").length;

  const lp = levelProgress(state.progress.xp);
  const today = plan.sessions
    .filter((s) => s.date === todayISO)
    .sort((a, b) => a.interval.start - b.interval.start);

  function complete(k: string) {
    if (state.sessionStatus[k] === "done") return;
    markSessionDone(k, todayISO);
    setFlash("+20 coins earned");
    setTimeout(() => setFlash(null), 1800);
  }

  const colorFor = (id: string) => subjectColors[nameById[id] ?? ""] ?? colors.accent;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top strip: wordmark + streak + coins */}
        <View style={styles.strip}>
          <Text style={[type.serif, { color: colors.text, fontSize: 20 }]}>Reflow</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
              <Text style={[type.footnote, { color: colors.gold }]}>🔥 {state.progress.streakDays}</Text>
            </View>
            <Link href="/rewards" asChild>
              <Pressable>
                <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
                  <Text style={[type.footnote, { color: colors.gold, fontFamily: type.data.fontFamily }]}>🪙 {state.progress.coins}</Text>
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Greeting */}
        <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.lg }]}>
          {WD_LONG[now.getDay()]!.toUpperCase()} · {now.getDate()} {MO[now.getMonth()]!.toUpperCase()}
        </Text>
        <Text style={[type.hero, { color: colors.text, marginTop: spacing.xs }]}>{greeting}</Text>

        {/* Countdown hero — the signature */}
        {nearest && (
          <View style={styles.countdown}>
            <View style={[styles.rule, { backgroundColor: colors.separator }]} />
            <Text style={[type.title, { color: colorFor(nearest.id), marginTop: spacing.md }]}>{nearest.name}</Text>
            <Text style={[type.heroItalic, { color: colors.text }]}>{daysAway(nearest.days)}</Text>
            <View style={[styles.rule, { backgroundColor: colors.separator, marginTop: spacing.md }]} />
          </View>
        )}

        {/* Momentum */}
        <View style={styles.block}>
          <View style={styles.rowBetween}>
            <Text style={[type.caption, { color: colors.textDim }]}>THIS WEEK</Text>
            <Text style={[type.caption, { color: colors.textFaint }]}>{doneCount} done</Text>
          </View>
          <View style={[styles.rowBetween, { alignItems: "flex-end", marginTop: spacing.xs }]}>
            <Text style={[type.title, { color: colors.text }]}>
              {fmtHours(totalMin / 60)} <Text style={[type.body, { color: colors.textFaint }]}>of {fmtHours(goalMin / 60)}</Text>
            </Text>
            <View style={styles.spark}>
              {perDay.map((m, i) => (
                <View key={i} style={styles.sparkCol}>
                  <View style={[styles.sparkBar, { height: 6 + (m / maxDay) * 34, backgroundColor: weekDates[i] === todayISO ? colors.gold : colors.accent, opacity: m > 0 ? 1 : 0.18 }]} />
                  <Text style={[styles.sparkLbl, { color: colors.textFaint }]}>{weekdayShort(weekDates[i]!)[0]}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* Level */}
          <View style={[styles.rowBetween, { marginTop: spacing.lg }]}>
            <Text style={[type.footnote, { color: colors.textDim }]}>Level {lp.level}</Text>
            <Text style={[type.footnote, { color: colors.textFaint }]}>{lp.into}/{lp.span} XP</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.separator }]}>
            <View style={[styles.fill, { width: `${Math.min(100, lp.frac * 100)}%`, backgroundColor: colors.gold }]} />
          </View>
        </View>

        {/* Tonight */}
        <View style={styles.block}>
          <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>
            {hour < 18 ? "TODAY" : "TONIGHT"}
          </Text>
          {today.length === 0 ? (
            <Text style={[type.serif, { color: colors.textDim }]}>Nothing scheduled — rest well.</Text>
          ) : (
            today.map((s, i) => {
              const k = sessionKeyOf(s);
              const done = state.sessionStatus[k] === "done";
              return (
                <Pressable key={i} onPress={() => complete(k)} style={styles.agenda}>
                  <View style={[styles.dot, { borderColor: colorFor(s.subjectId), backgroundColor: done ? colorFor(s.subjectId) : "transparent" }]}>
                    {done && <Text style={styles.tick}>✓</Text>}
                  </View>
                  <Text style={[type.body, { color: colors.text, flex: 1, textDecorationLine: done ? "line-through" : "none", opacity: done ? 0.5 : 1 }]}>
                    {nameById[s.subjectId]}
                  </Text>
                  <Text style={[type.callout, { color: colors.textDim, fontFamily: type.data.fontFamily }]}>
                    {fmtTime(s.interval.start)}–{fmtTime(s.interval.end)}
                  </Text>
                </Pressable>
              );
            })
          )}
          <Link href="/week" asChild>
            <Pressable style={{ marginTop: spacing.sm }}>
              <Text style={[type.footnote, { color: colors.accent }]}>See the full week →</Text>
            </Pressable>
          </Link>
        </View>

        {/* Shelf */}
        <View style={styles.shelf}>
          {[
            { href: "/practice", icon: "✎", label: "Practice" },
            { href: "/rewards", icon: "🪙", label: "Rewards" },
            { href: "/metrics", icon: "▦", label: "Insights" },
            { href: "/timer", icon: "◷", label: "Focus" },
          ].map((t) => (
            <Link key={t.href} href={t.href as any} asChild>
              <Pressable style={{ flex: 1 }}>
                <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
                  <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                  <Text style={[type.caption, { color: colors.textDim, marginTop: 4 }]}>{t.label.toUpperCase()}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
        <Link href="/setup" asChild>
          <Pressable><Text style={[type.footnote, { color: colors.textFaint, textAlign: "center", marginTop: spacing.lg }]}>Corrections · Library · Settings →</Text></Pressable>
        </Link>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {flash && (
        <View style={[styles.flash, { backgroundColor: colors.gold }]}>
          <Text style={[type.headline, { color: "#fff" }]}>{flash}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 0 },
  strip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  countdown: { marginTop: spacing.xl },
  rule: { height: StyleSheet.hairlineWidth },
  block: { marginTop: spacing.xxl },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  spark: { flexDirection: "row", gap: 5, alignItems: "flex-end", height: 52 },
  sparkCol: { alignItems: "center", gap: 3 },
  sparkBar: { width: 7, borderRadius: 3 },
  sparkLbl: { fontSize: 9, fontFamily: type.caption.fontFamily },
  track: { height: 4, borderRadius: 2, marginTop: spacing.sm, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  agenda: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tick: { color: "#fff", fontSize: 12, fontFamily: type.headline.fontFamily },
  shelf: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xxl },
  tile: { alignItems: "center", paddingVertical: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  flash: { position: "absolute", bottom: spacing.xxl, alignSelf: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
});
