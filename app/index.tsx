import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type } from "../src/theme/tokens";
import { computePlan, sessionKeyOf, unreviewedCorrections, weakestTopic } from "../src/state/model";
import { useStore } from "../src/state/store";
import type { Interval } from "../src/engine/types";
import { resolveBlock } from "../src/lib/blockEntry";
import { dayNum, fmtHours, fmtTime, weekdayShort } from "../src/lib/format";

const colorFor = (id: string, name?: string) =>
  subjectColors[name ?? ""] ?? subjectColors[id] ?? "#5E5CE6";

const shiftISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const minutes = (iv: { interval: Interval }[]) =>
  iv.reduce((t, s) => t + (s.interval.end - s.interval.start), 0);

export default function ThisWeek() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const addBlock = useStore((s) => s.addBlock);
  const removeBlock = useStore((s) => s.removeBlock);
  const setRefDate = useStore((s) => s.setRefDate);
  const setSessionStatus = useStore((s) => s.setSessionStatus);
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[type.footnote, { color: colors.accent, fontWeight: "700", letterSpacing: 1 }]}>
              {weekdayShort(days[0]!)} {dayNum(days[0]!)} – {weekdayShort(days[6]!)} {dayNum(days[6]!)}
            </Text>
            <Text style={[type.largeTitle, { color: colors.text }]}>This Week</Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Link href="/practice" asChild>
              <Pressable hitSlop={10}>
              <View style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 18 }}>✏️</Text>
              </View>
            </Pressable>
            </Link>
            <Link href="/timer" asChild>
              <Pressable hitSlop={10}>
              <View style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 18 }}>⏱</Text>
              </View>
            </Pressable>
            </Link>
            <Link href="/metrics" asChild>
              <Pressable hitSlop={10}>
              <View style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 18 }}>📊</Text>
              </View>
            </Pressable>
            </Link>
            <Link href="/corrections" asChild>
              <Pressable hitSlop={10}>
              <View style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 18 }}>📓</Text>
              </View>
            </Pressable>
            </Link>
            <Link href="/setup" asChild>
              <Pressable hitSlop={10}>
              <View style={[styles.iconBtn, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 18 }}>⚙︎</Text>
              </View>
            </Pressable>
            </Link>
          </View>
        </View>

        <Text style={[type.callout, { color: colors.textDim }]}>
          {fmtHours(totalPlanned / 60)} planned toward {fmtHours(state.config.weeklyGoalHours)}
          {plan.sessions.length > 0 ? ` · ${doneCount}/${plan.sessions.length} done` : ""}
        </Text>

        {/* Week nav */}
        <View style={styles.weekNav}>
          <Pressable onPress={() => setRefDate(shiftISO(state.week.refDateISO, -7))} style={[styles.navBtn, { backgroundColor: colors.accentSoft }]}>
            <Text style={[type.headline, { color: colors.accent }]}>‹ Prev</Text>
          </Pressable>
          <Pressable onPress={() => setRefDate(shiftISO(state.week.refDateISO, 7))} style={[styles.navBtn, { backgroundColor: colors.accentSoft }]}>
            <Text style={[type.headline, { color: colors.accent }]}>Next ›</Text>
          </Pressable>
        </View>

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
          <Pressable onPress={quickAdd} hitSlop={8}>
            <Text style={[type.headline, { color: colors.accent }]}>Block</Text>
          </Pressable>
        </Surface>

        {/* Allocation chips */}
        <View style={styles.chips}>
          {plan.allocations.map((a) => (
            <View key={a.subjectId} style={[styles.chip, { backgroundColor: colors.surface }]}>
              <View style={[styles.dot, { backgroundColor: colorFor(a.subjectId, nameById[a.subjectId]) }]} />
              <Text style={[type.footnote, { color: colors.text, fontWeight: "600" }]}>{nameById[a.subjectId] ?? a.subjectId}</Text>
              <Text style={[type.footnote, { color: colors.textDim }]}>{fmtHours(a.hours)}</Text>
            </View>
          ))}
        </View>

        {banner && (
          <Surface style={styles.banner}>
            <Text style={[type.footnote, { color: banner.error ? colors.danger : colors.text, flex: 1 }]}>
              {banner.text}
            </Text>
            {banner.undo ? (
              <Pressable onPress={banner.undo} hitSlop={8}>
                <Text style={[type.headline, { color: colors.accent }]}>Undo</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setBanner(null)} hitSlop={8}>
                <Text style={[type.headline, { color: colors.accent }]}>OK</Text>
              </Pressable>
            )}
          </Surface>
        )}

        {unplaced.length > 0 && (
          <Surface style={{ marginTop: spacing.md, backgroundColor: colors.accentSoft }}>
            <Text style={[type.footnote, { color: colors.warning, fontWeight: "600" }]}>
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
                  <Text style={[type.headline, { color: colors.text }]}>
                    {weekdayShort(date)} {dayNum(date)}
                  </Text>
                  <View style={styles.dayHeaderRight}>
                    <Text style={[type.footnote, { color: colors.textFaint }]}>
                      {ss.length ? fmtHours(minutes(ss) / 60) : "rest"}
                    </Text>
                    <Pressable onPress={() => blockDay(date)} hitSlop={8}>
                      <Text style={[type.footnote, { color: colors.accent, fontWeight: "700" }]}>＋ Block</Text>
                    </Pressable>
                  </View>
                </View>

                {blocks.map((b, i) => (
                  <View key={`b${i}`} style={[styles.session, { backgroundColor: colors.accentSoft }]}>
                    <View style={[styles.bar, { backgroundColor: colors.danger }]} />
                    <Text style={[type.callout, { color: colors.danger, flex: 1 }]}>
                      Blocked {fmtTime(b.start)} – {fmtTime(b.end)}
                    </Text>
                    <Pressable onPress={() => removeBlock(date, i)} hitSlop={8}>
                      <Text style={[type.headline, { color: colors.accent }]}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                {ss.map((s, i) => {
                  const key = sessionKeyOf(s);
                  const status = state.sessionStatus[key];
                  const done = status === "done";
                  const skipped = status === "skipped";
                  const color = colorFor(s.subjectId, nameById[s.subjectId]);
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
                      onPress={() => setSessionStatus(key, done ? null : "done")}
                      onLongPress={() => setSessionStatus(key, skipped ? null : "skipped")}
                      style={[styles.session, { borderTopColor: colors.separator, borderTopWidth: i === 0 && blocks.length === 0 ? 0 : StyleSheet.hairlineWidth }]}
                    >
                      <View style={[styles.check, { borderColor: color, backgroundColor: done ? color : "transparent" }]}>
                        {done && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                      <View style={{ flex: 1, opacity: status ? 0.5 : 1 }}>
                        <Text style={[type.body, { color: colors.text, textDecorationLine: done ? "line-through" : "none" }]}>
                          {nameById[s.subjectId] ?? s.subjectId}
                        </Text>
                        <Text style={[type.caption, { color: skipped ? colors.warning : colors.textFaint }]} numberOfLines={1}>
                          {mission}
                        </Text>
                      </View>
                      <Text style={[type.callout, { color: colors.textDim, opacity: status ? 0.5 : 1 }]}>
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
  scroll: { padding: spacing.lg, paddingBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  weekNav: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  navBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: "center" },
  quickAdd: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, paddingVertical: spacing.md },
  input: { flex: 1, padding: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  dayCard: { overflow: "hidden" },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  dayHeaderRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  session: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bar: { width: 4, height: 22, borderRadius: 2 },
});
