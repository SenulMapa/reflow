import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { PressableScale } from "../src/components/PressableScale";
import { DotField } from "../src/components/DotField";
import { SegmentedBar } from "../src/components/SegmentedBar";
import { Surface } from "../src/components/Surface";
import { Pill } from "../src/components/Pill";
import { haptics } from "../src/lib/haptics";
import { EARN } from "../src/state/rewards";
import {
  fmtCountdown,
  isComplete,
  nextPhase,
  phaseDurationMs,
  remainingMs,
  type Phase,
} from "../src/lib/pomodoro";

const FOCUS_PRESETS = [15, 25, 50];
const BREAK_PRESETS = [5, 10, 15];
const PROGRESS_SEGMENTS = 24;
const todayISO = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function Timer() {
  const { colors } = useTheme();
  const router = useRouter();
  const state = useStore((s) => s.state);
  const addFocusSession = useStore((s) => s.addFocusSession);
  const addPlant = useStore((s) => s.addPlant);
  const setPomodoro = useStore((s) => s.setPomodoro);
  const award = useStore((s) => s.award);
  const markSessionDone = useStore((s) => s.markSessionDone);

  // Session identity from Home's "Start": which scheduled session this timer is
  // running. Present ⇒ finishing ticks that calendar session done and threads the
  // reflection to it. Absent ⇒ a freeform timer (subject still pickable below).
  const params = useLocalSearchParams<{ sessionKey?: string; subjectId?: string; date?: string; mission?: string }>();
  const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const sessionKey = str(params.sessionKey);
  const sessionDate = str(params.date);
  const mission = str(params.mission);

  const config = state.config.pomodoro;
  const subjects = state.config.subjects;
  const [subjectId, setSubjectId] = useState<string | undefined>(str(params.subjectId));
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [accum, setAccum] = useState(0);
  const startedAt = useRef<number | null>(null);
  const [, setTick] = useState(0);
  const [done, setDone] = useState<{ minutes: number; subjectId?: string; wilted?: boolean } | null>(null);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(iv);
  }, [running]);

  const now = Date.now();
  const elapsed = accum + (running && startedAt.current ? now - startedAt.current : 0);
  const remaining = remainingMs(config, phase, elapsed);
  const progress = Math.min(1, Math.max(0, 1 - remaining / phaseDurationMs(config, phase)));

  // Phase completion.
  useEffect(() => {
    if (!running || !isComplete(config, phase, elapsed)) return;
    if (phase === "focus") {
      addFocusSession({ id: `${Date.now()}`, subjectId, date: todayISO(), minutes: config.focusMin });
      addPlant(subjectId, todayISO()); // the garden grows
      award(EARN.focus.coins, EARN.focus.xp, "Focus session", todayISO());
      // Close the loop: tick the scheduled calendar session done (idempotent; also
      // awards EARN.session + streak) so Home's Now-block advances instead of
      // re-showing the same "next". Guarded so freeform timers write no bogus key.
      if (sessionKey) markSessionDone(sessionKey, sessionDate ?? todayISO());
      haptics.success();
      setDone({ minutes: config.focusMin, subjectId });
      setRunning(false);
      setPhase("focus");
      setAccum(0);
      startedAt.current = null;
      return;
    }
    // break finished → back to focus
    setPhase(nextPhase(phase));
    setAccum(0);
    startedAt.current = Date.now();
  }, [elapsed, running, phase]);

  const start = () => { haptics.light(); startedAt.current = Date.now(); setDone(null); setRunning(true); };
  const pause = () => { setAccum(elapsed); startedAt.current = null; setRunning(false); };
  const reset = () => {
    // Bailing mid-focus wilts the sprout (not persisted — just the honest sting).
    if (running && phase === "focus" && elapsed > 20_000) {
      haptics.light();
      setDone({ minutes: 0, subjectId, wilted: true });
    }
    setRunning(false); setPhase("focus"); setAccum(0); startedAt.current = null;
  };
  const setFocusMin = (m: number) => setPomodoro({ ...config, focusMin: m });
  const setBreakMin = (m: number) => setPomodoro({ ...config, breakMin: m });

  // The running clock is the one live status → the digits carry the signal-red
  // while focus is ticking. Paused, break, and idle are all monochrome.
  const clockColor = running && phase === "focus" ? colors.accent : colors.display;
  const focusedToday = state.focusSessions.filter((f) => f.date === todayISO()).reduce((t, f) => t + f.minutes, 0);
  // Growth reads as filled dots (Garden language) — one per pomodoro logged today.
  const sessionsToday = state.focusSessions.filter((f) => f.date === todayISO()).length;

  // ── Completion / wilt card ─────────────────────────────────────────────
  if (done) {
    const wilted = done.wilted;
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
        <DotField />
        <View style={styles.doneWrap}>
          {wilted ? (
            <Text style={[type.caption, { color: colors.textFaint }]}>session left early</Text>
          ) : (
            <View style={{ alignItems: "center", gap: spacing.xs }}>
              <Text style={[type.numeralLg, { color: colors.display }]}>{done.minutes}</Text>
              <Text style={[type.caption, { color: colors.textFaint }]}>minutes focused</Text>
            </View>
          )}
          <Text style={[type.title, { color: colors.text, textAlign: "center" }]}>
            {wilted ? "Session left early." : "Session complete."}
          </Text>
          <Text style={[type.serif, { color: colors.textDim, textAlign: "center", paddingHorizontal: spacing.xl }]}>
            {wilted
              ? "The sprout wilted — that's okay. Come back and grow the next one."
              : `+1 plant in your garden · +${EARN.focus.coins} coins. Want to capture what you just did?`}
          </Text>
          <View style={styles.doneActions}>
            {!wilted && (
              <Pill
                label="reflect on this session"
                haptic="light"
                onPress={() => router.push({ pathname: "/reflect", params: { subjectId: done.subjectId ?? "", minutes: String(done.minutes), sessionKey: sessionKey ?? "" } })}
              />
            )}
            <PressableScale haptic="selection" onPress={() => setDone(null)} hitSlop={12}>
              <Text style={[type.caption, { color: colors.textDim }]}>{wilted ? "try again" : "not now"}</Text>
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <View style={styles.container}>
        <View style={styles.top}>
          <PressableScale haptic="selection" onPress={() => router.push("/")} hitSlop={10}>
            <Text style={[type.caption, { color: colors.text }]}>‹ home</Text>
          </PressableScale>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[type.data, { color: colors.text }]}>{Math.round(focusedToday)}</Text>
            <Text style={[type.caption, { color: colors.textFaint }]}>min today</Text>
          </View>
        </View>

        <View style={styles.center}>
          <Text style={[type.caption, { color: colors.textDim }]}>{phase === "focus" ? "focus" : "break"}</Text>
          {mission && phase === "focus" && (
            <Text style={[type.mono, { color: colors.textDim, textAlign: "center", paddingHorizontal: spacing.lg }]} numberOfLines={1}>
              {mission}
            </Text>
          )}
          <Text style={[type.numeralHero, styles.count, { color: clockColor }]}>{fmtCountdown(remaining)}</Text>

          <View style={styles.progress}>
            <SegmentedBar value={progress * PROGRESS_SEGMENTS} total={PROGRESS_SEGMENTS} height={8} />
          </View>

          {/* Growth: one filled dot per pomodoro logged today. */}
          {sessionsToday > 0 && (
            <View style={{ alignItems: "center", gap: spacing.xs, marginTop: spacing.sm }}>
              <View style={styles.dotsRow}>
                {Array.from({ length: sessionsToday }).map((_, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: colors.display }]} />
                ))}
              </View>
              <Text style={[type.caption, { color: colors.textFaint }]}>done today</Text>
            </View>
          )}

          {/* Duration selector — editable when not running */}
          {!running && (
            <Surface style={styles.configCard}>
              <View style={styles.presetRow}>
                <Text style={[type.caption, { color: colors.textFaint, width: 52 }]}>focus</Text>
                {FOCUS_PRESETS.map((m) => (
                  <PressableScale key={m} haptic="selection" onPress={() => setFocusMin(m)}
                    style={[styles.preset, config.focusMin === m
                      ? { backgroundColor: colors.display, borderColor: colors.display }
                      : { backgroundColor: "transparent", borderColor: colors.line2 }]}>
                    <Text style={[type.mono, { color: config.focusMin === m ? colors.bg : colors.textDim }]}>{m}m</Text>
                  </PressableScale>
                ))}
              </View>
              <View style={styles.presetRow}>
                <Text style={[type.caption, { color: colors.textFaint, width: 52 }]}>break</Text>
                {BREAK_PRESETS.map((m) => (
                  <PressableScale key={m} haptic="selection" onPress={() => setBreakMin(m)}
                    style={[styles.preset, config.breakMin === m
                      ? { backgroundColor: colors.display, borderColor: colors.display }
                      : { backgroundColor: "transparent", borderColor: colors.line2 }]}>
                    <Text style={[type.mono, { color: config.breakMin === m ? colors.bg : colors.textDim }]}>{m}m</Text>
                  </PressableScale>
                ))}
              </View>
            </Surface>
          )}

          {/* Subject */}
          <View style={styles.subjects}>
            <PressableScale haptic="selection" onPress={() => setSubjectId(undefined)}
              style={[styles.subjectChip, subjectId === undefined
                ? { backgroundColor: colors.display, borderColor: colors.display }
                : { backgroundColor: "transparent", borderColor: colors.line2 }]}>
              <Text style={[type.mono, { color: subjectId === undefined ? colors.bg : colors.textDim }]}>General</Text>
            </PressableScale>
            {subjects.map((s) => (
              <PressableScale key={s.id} haptic="selection" onPress={() => setSubjectId(s.id)}
                style={[styles.subjectChip, subjectId === s.id
                  ? { backgroundColor: colors.display, borderColor: colors.display }
                  : { backgroundColor: "transparent", borderColor: colors.line2 }]}>
                <Text style={[type.mono, { color: subjectId === s.id ? colors.bg : colors.textDim }]}>{s.name}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={styles.controls}>
          <Pill
            label={running ? "pause" : "start"}
            haptic="light"
            onPress={running ? pause : start}
            style={styles.ctrlPrimary}
          />
          <PressableScale haptic="selection" onPress={reset} hitSlop={12} style={styles.resetLink}>
            <Text style={[type.caption, { color: colors.textDim }]}>reset</Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, ...bounded },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  count: { marginTop: spacing.md },
  progress: { width: "80%", marginTop: spacing.xl },
  dotsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", maxWidth: 220 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  configCard: { marginTop: spacing.xxl, gap: spacing.sm, alignItems: "center" },
  presetRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  preset: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, minWidth: 44, alignItems: "center" },
  subjects: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.xl },
  subjectChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  controls: { alignItems: "center", gap: spacing.lg },
  ctrlPrimary: { width: "100%" },
  resetLink: { paddingVertical: spacing.xs },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xl },
  doneActions: { alignItems: "center", gap: spacing.lg, marginTop: spacing.sm },
});
