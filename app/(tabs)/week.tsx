import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../../src/components/Surface";
import { DotField } from "../../src/components/DotField";
import { useTheme } from "../../src/theme/theme";
import { radius, spacing, type, bounded } from "../../src/theme/tokens";
import { computePlan, sessionKeyOf, unreviewedCorrections, weakestTopic } from "../../src/state/model";
import { useStore } from "../../src/state/store";
import type { Interval } from "../../src/engine/types";
import { resolveBlock } from "../../src/lib/blockEntry";
import { dayNum, fmtHours, fmtTime, weekdayShort } from "../../src/lib/format";

const NAV: { href: string; label: string }[] = [
  { href: "/practice", label: "PRAC" },
  { href: "/timer", label: "TIME" },
  { href: "/metrics", label: "STAT" },
  { href: "/corrections", label: "FIX" },
  { href: "/setup", label: "CFG" },
];

const shiftISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const minutes = (iv: { interval: Interval }[]) =>
  iv.reduce((t, s) => t + (s.interval.end - s.interval.start), 0);

export default function ThisWeek() {
  const { colors } = useTheme();
  const router = useRouter();
  const state = useStore((s) => s.state);
  const addBlock = useStore((s) => s.addBlock);
  const removeBlock = useStore((s) => s.removeBlock);
  const setRefDate = useStore((s) => s.setRefDate);
  const reflowWeek = useStore((s) => s.reflowWeek);
  const clearReflow = useStore((s) => s.clearReflow);
  const setSessionStatus = useStore((s) => s.setSessionStatus);
  const markSessionDone = useStore((s) => s.markSessionDone);
  const [banner, setBanner] = useState<{ text: string; undo?: () => void; error?: boolean } | null>(null);
  const [quickText, setQuickText] = useState("");

  const nameById = useMemo(
    () => Object.fromEntries(state.config.subjects.map((s) => [s.id, s.name])),
    [state.config.subjects]
  );
  const plan = useMemo(() => computePlan(state), [state]);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i++) out.push(shiftISO(state.week.refDateISO, i));
    return out;
  }, [state.week.refDateISO]);

  const todayISO = useMemo(() => {
    const now = new Date();
    const p = (n: number) => n.toString().padStart(2, "0");
    const t = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
    return days.includes(t) ? t : days[0]!;
  }, [days]);

  const totalPlanned = minutes(plan.sessions);
  const doneCount = plan.sessions.filter((s) => state.sessionStatus[sessionKeyOf(s)] === "done").length;
  const unplaced = Object.entries(plan.unplacedHours).filter(([, h]) => h > 0.01);

  async function quickAdd() {
    const res = await resolveBlock(quickText, { weekDates: days, todayISO });
    if (!res.ok) {
      setBanner({ text: res.error, error: true });
      return;
    }
    const { date, start, end, reason } = res.block;
    const idx = (state.week.blocks[date] ?? []).length;
    addBlock(date, { start, end });
    setQuickText("");
    setBanner({
      text: `Blocked ${weekdayShort(date)} ${fmtTime(start)}–${fmtTime(end)}${reason ? ` · ${reason}` : ""}`,
      undo: () => {
        removeBlock(date, idx);
        setBanner(null);
      },
    });
  }

  function blockDay(date: string) {
    const wd = new Date(date + "T00:00:00Z").getUTCDay();
    const win = state.config.availability[wd]?.[0];
    if (!win) return;
    const block: Interval = { start: win.start, end: Math.min(win.start + 120, win.end) };
    const idx = (state.week.blocks[date] ?? []).length;
    addBlock(date, block);
    setBanner({
      text: `Blocked ${fmtTime(block.start)}–${fmtTime(block.end)} · rebalanced ${weekdayShort(date)}`,
      undo: () => {
        removeBlock(date, idx);
        setBanner(null);
      },
    });
  }

  const sessionsByDate = (date: string) =>
    plan.sessions.filter((s) => s.date === date).sort((a, b) => a.interval.start - b.interval.start);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/" asChild>
          <Pressable hitSlop={10}><Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>‹ HOME</Text></Pressable>
        </Link>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[type.caption, { color: colors.textDim }]}>
              {weekdayShort(days[0]!)} {dayNum(days[0]!)} – {weekdayShort(days[6]!)} {dayNum(days[6]!)}
            </Text>
            <Text style={[type.largeTitle, { color: colors.text }]}>This Week</Text>
          </View>
          <View style={styles.navRow}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} asChild>
                <Pressable hitSlop={6}>
                  <View style={[styles.iconBtn, { borderColor: colors.line2 }]}>
                    <Text style={[type.caption, { color: colors.text }]}>{n.label}</Text>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>

        <Text style={[type.callout, { color: colors.textDim, marginTop: spacing.xs }]}>
          <Text style={[type.data, { color: colors.text }]}>{fmtHours(totalPlanned / 60)}</Text> planned toward{" "}
          <Text style={[type.data, { color: colors.text }]}>{fmtHours(state.config.weeklyGoalHours)}</Text>
          {plan.sessions.length > 0 ? (
            <Text>
              {" · "}
              <Text style={[type.data, { color: colors.text }]}>{doneCount}/{plan.sessions.length}</Text> done
            </Text>
          ) : null}
        </Text>

        {/* Week nav */}
        <View style={styles.weekNav}>
          <Pressable onPress={() => setRefDate(shiftISO(state.week.refDateISO, -7))} style={[styles.navBtn, { borderColor: colors.line2 }]}>
            <Text style={[type.mono, { color: colors.text }]}>‹ PREV</Text>
          </Pressable>
          <Pressable onPress={() => setRefDate(shiftISO(state.week.refDateISO, 7))} style={[styles.navBtn, { borderColor: colors.line2 }]}>
            <Text style={[type.mono, { color: colors.text }]}>NEXT ›</Text>
          </Pressable>
        </View>

        {/* Self-heal: re-fit the remaining goal from today when you've fallen behind. */}
        {state.week.reflowedFromISO ? (
          <Pressable
            onPress={() => { clearReflow(); setBanner({ text: "Back to the full even week." }); }}
            style={[styles.reflowRow, { borderColor: colors.line2, borderWidth: 1 }]}
          >
            <View style={styles.reflowLabel}>
              <View style={[styles.markDot, { backgroundColor: colors.text }]} />
              <Text style={[type.mono, { color: colors.text, flex: 1 }]}>SELF-HEALING ON — REMAINING HOURS RE-FIT FROM TODAY</Text>
            </View>
            <Text style={[type.caption, { color: colors.textDim }]}>RESET</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              reflowWeek(todayISO);
              setBanner({ text: "Reflowed — I re-fit what's left into the days ahead.", undo: () => { clearReflow(); setBanner(null); } });
            }}
            style={[styles.reflowRow, { borderColor: colors.accentText, borderWidth: 1 }]}
          >
            <Text style={[type.mono, { color: colors.accentText }]}>BEHIND? REFLOW THE REST OF THE WEEK →</Text>
          </Pressable>
        )}

        {/* Natural-language quick block */}
        <Surface style={styles.quickAdd}>
          <TextInput
            value={quickText}
            onChangeText={setQuickText}
            placeholder="Block time — “dinner tonight 6–8”"
            placeholderTextColor={colors.textFaint}
            style={[type.body, styles.input, { color: colors.text }]}
            onSubmitEditing={quickAdd}
            returnKeyType="done"
            autoCapitalize="none"
          />
          <Pressable onPress={quickAdd} hitSlop={8} style={[styles.blockBtn, { backgroundColor: colors.display }]}>
            <Text style={[type.caption, { color: colors.bg }]}>BLOCK</Text>
          </Pressable>
        </Surface>

        {/* Availability entry — where fixed commitments live, the schedule reflows around them */}
        <Pressable
          onPress={() => router.push("/availability")}
          style={[styles.availRow, { borderColor: colors.separator }]}
        >
          <View style={styles.reflowLabel}>
            <View style={[styles.markDot, { backgroundColor: colors.textDim }]} />
            <Text style={[type.mono, { color: colors.text }]}>FIXED COMMITMENTS / BLOCKS</Text>
          </View>
          <Text style={[type.mono, { color: colors.textDim }]}>›</Text>
        </Pressable>

        {/* Allocation chips */}
        <View style={styles.chips}>
          {plan.allocations.map((a) => (
            <View key={a.subjectId} style={[styles.chip, { borderColor: colors.line2 }]}>
              <Text style={[type.caption, { color: colors.text }]}>
                {(nameById[a.subjectId] ?? a.subjectId)} · {fmtHours(a.hours)}
              </Text>
            </View>
          ))}
        </View>

        {banner && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Surface style={styles.banner}>
              <Text style={[type.footnote, { color: banner.error ? colors.danger : colors.text, flex: 1 }]}>
                {banner.text}
              </Text>
              {banner.undo ? (
                <Pressable onPress={banner.undo} hitSlop={8}>
                  <Text style={[type.caption, { color: colors.text }]}>UNDO</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setBanner(null)} hitSlop={8}>
                  <Text style={[type.caption, { color: colors.text }]}>OK</Text>
                </Pressable>
              )}
            </Surface>
          </Animated.View>
        )}

        {unplaced.length > 0 && (
          <Surface style={{ marginTop: spacing.md }}>
            <Text style={[type.footnote, { color: colors.textDim }]}>
              Couldn’t fit {unplaced.map(([id, h]) => `${fmtHours(h)} ${nameById[id] ?? id}`).join(", ")} this week.
            </Text>
          </Surface>
        )}

        {/* Days */}
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          {days.map((date) => {
            const ss = sessionsByDate(date);
            const blocks = state.week.blocks[date] ?? [];
            return (
              <Surface key={date} padded={false} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayHeaderLeft}>
                    <Text style={[type.mono, { color: colors.text }]}>{weekdayShort(date).toUpperCase()}</Text>
                    <Text style={[type.data, { color: colors.text }]}>{dayNum(date)}</Text>
                  </View>
                  <View style={styles.dayHeaderRight}>
                    {ss.length ? (
                      <Text style={[type.data, { color: colors.textDim }]}>{fmtHours(minutes(ss) / 60)}</Text>
                    ) : (
                      <Text style={[type.caption, { color: colors.textFaint }]}>REST</Text>
                    )}
                    <Pressable onPress={() => blockDay(date)} hitSlop={8}>
                      <Text style={[type.caption, { color: colors.textDim }]}>+ BLOCK</Text>
                    </Pressable>
                  </View>
                </View>

                {blocks.map((b, i) => (
                  <View key={`b${i}`} style={styles.session}>
                    <View style={[styles.markDot, { backgroundColor: colors.textDim }]} />
                    <Text style={[type.mono, { color: colors.textDim, flex: 1 }]}>
                      BLOCKED {fmtTime(b.start)} – {fmtTime(b.end)}
                    </Text>
                    <Pressable onPress={() => removeBlock(date, i)} hitSlop={8}>
                      <Text style={[type.body, { color: colors.textFaint }]}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                {ss.map((s, i) => {
                  const key = sessionKeyOf(s);
                  const status = state.sessionStatus[key];
                  const done = status === "done";
                  const skipped = status === "skipped";
                  const wt = weakestTopic(state, s.subjectId);
                  const toReview = wt ? unreviewedCorrections(state, s.subjectId, wt.id) : 0;
                  const mission = skipped
                    ? "Skipped — tap to restore"
                    : wt
                      ? `${wt.name} · ${wt.confidence}/10${toReview ? ` · ${toReview} to review` : ""}`
                      : "Study session";
                  return (
                    <Pressable
                      key={i}
                      onPress={() => (done ? setSessionStatus(key, null) : markSessionDone(key, date))}
                      onLongPress={() => setSessionStatus(key, skipped ? null : "skipped")}
                      style={[styles.session, { borderTopColor: colors.separator, borderTopWidth: i === 0 && blocks.length === 0 ? 0 : StyleSheet.hairlineWidth }]}
                    >
                      <View style={[styles.check, { borderColor: colors.line2, backgroundColor: done ? colors.display : "transparent" }]}>
                        {done && <Text style={[styles.checkMark, { color: colors.bg }]}>✓</Text>}
                      </View>
                      <View style={{ flex: 1, opacity: status ? 0.5 : 1 }}>
                        <Text style={[type.mono, { color: colors.text, textTransform: "uppercase", textDecorationLine: done ? "line-through" : "none" }]}>
                          {nameById[s.subjectId] ?? s.subjectId}
                        </Text>
                        <Text style={[type.caption, { color: skipped ? colors.textDim : colors.textFaint }]} numberOfLines={1}>
                          {mission}
                        </Text>
                      </View>
                      <Text style={[type.mono, { color: colors.textDim, opacity: status ? 0.5 : 1 }]}>
                        {fmtTime(s.interval.start)} – {fmtTime(s.interval.end)}
                      </Text>
                    </Pressable>
                  );
                })}
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
  scroll: { padding: spacing.lg, paddingBottom: 0, ...bounded },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, justifyContent: "flex-end", maxWidth: 160 },
  iconBtn: { paddingHorizontal: spacing.sm, height: 30, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  weekNav: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  reflowRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  reflowLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  availRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.card, borderWidth: 1 },
  navBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: "center" },
  quickAdd: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, paddingVertical: spacing.md },
  input: { flex: 1, padding: 0 },
  blockBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1 },
  markDot: { width: 8, height: 8, borderRadius: 4 },
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  dayCard: { overflow: "hidden" },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  dayHeaderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dayHeaderRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  session: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkMark: { fontSize: 13 },
});
