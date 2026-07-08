import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { PressableScale } from "../src/components/PressableScale";
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

  const accent = phase === "focus" ? colors.accent : colors.success;
  const focusedToday = state.focusSessions.filter((f) => f.date === todayISO()).reduce((t, f) => t + f.minutes, 0);

  // The sprout grows with progress: pick a glyph along the growth as focus proceeds.
  const growthGlyph = ["🌱", "🌿", "🌾", "🌷", "🌻"][Math.min(4, Math.floor(progress * 5))];

  // ── Completion / wilt card ─────────────────────────────────────────────
  if (done) {
    const wilted = done.wilted;
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
        <View style={styles.doneWrap}>
          <Text style={{ fontSize: 72 }}>{wilted ? "🥀" : "🌻"}</Text>
          <Text style={[type.largeTitle, { color: colors.text, textAlign: "center" }]}>
            {wilted ? "Session left early." : "Session complete."}
          </Text>
          <Text style={[type.serif, { color: colors.textDim, textAlign: "center", paddingHorizontal: spacing.xl }]}>
            {wilted
              ? "The sprout wilted — that's okay. Come back and grow the next one."
              : `+1 plant in your garden · +${EARN.focus.coins} coins. Want to capture what you just did?`}
          </Text>
          {!wilted && (
            <PressableScale
              haptic="light"
              onPress={() => router.push({ pathname: "/reflect", params: { subjectId: done.subjectId ?? "", minutes: String(done.minutes), sessionKey: sessionKey ?? "" } })}
              style={[styles.doneCta, { backgroundColor: colors.accent }]}
            >
              <Text style={[type.headline, { color: "#fff" }]}>Reflect on this session</Text>
            </PressableScale>
          )}
          <PressableScale haptic="selection" onPress={() => setDone(null)} style={styles.doneGhost}>
            <Text style={[type.callout, { color: colors.textDim }]}>{wilted ? "Try again" : "Not now"}</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.top}>
          <PressableScale haptic="selection" onPress={() => router.push("/")} hitSlop={10}>
            <Text style={[type.headline, { color: colors.accent }]}>‹ Home</Text>
          </PressableScale>
          <Text style={[type.footnote, { color: colors.textDim }]}>{Math.round(focusedToday)}m focused today · 🌿 {state.garden.length}</Text>
        </View>

        <View style={styles.center}>
          <Text style={[type.caption, { color: accent }]}>{phase === "focus" ? "FOCUS" : "BREAK"}</Text>
          {mission && phase === "focus" && (
            <Text style={[type.footnote, { color: colors.textDim, textAlign: "center", paddingHorizontal: spacing.lg }]} numberOfLines={1}>
              {mission}
            </Text>
          )}
          <Text style={{ fontSize: 30, marginTop: 2 }}>{running && phase === "focus" ? growthGlyph : "🪴"}</Text>
          <Text style={[styles.count, { color: colors.text }]}>{fmtCountdown(remaining)}</Text>

          <View style={[styles.track, { backgroundColor: colors.separator }]}>
            <View style={[styles.fill, { backgroundColor: accent, width: `${progress * 100}%` }]} />
          </View>

          {/* Duration selector — editable when not running */}
          {!running && (
            <View style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.lg }}>
              <View style={styles.presetRow}>
                <Text style={[type.caption, { color: colors.textFaint, width: 52 }]}>FOCUS</Text>
                {FOCUS_PRESETS.map((m) => (
                  <PressableScale key={m} haptic="selection" onPress={() => setFocusMin(m)}
                    style={[styles.preset, { backgroundColor: config.focusMin === m ? accent : colors.surface, borderColor: colors.separator }]}>
                    <Text style={[type.footnote, { color: config.focusMin === m ? "#fff" : colors.textDim }]}>{m}m</Text>
                  </PressableScale>
                ))}
              </View>
              <View style={styles.presetRow}>
                <Text style={[type.caption, { color: colors.textFaint, width: 52 }]}>BREAK</Text>
                {BREAK_PRESETS.map((m) => (
                  <PressableScale key={m} haptic="selection" onPress={() => setBreakMin(m)}
                    style={[styles.preset, { backgroundColor: config.breakMin === m ? colors.success : colors.surface, borderColor: colors.separator }]}>
                    <Text style={[type.footnote, { color: config.breakMin === m ? "#fff" : colors.textDim }]}>{m}m</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          )}

          {/* Subject */}
          <View style={styles.subjects}>
            <PressableScale haptic="selection" onPress={() => setSubjectId(undefined)}
              style={[styles.subjectChip, { backgroundColor: subjectId === undefined ? accent : colors.surface }]}>
              <Text style={[type.footnote, { color: subjectId === undefined ? "#fff" : colors.textDim }]}>General</Text>
            </PressableScale>
            {subjects.map((s) => (
              <PressableScale key={s.id} haptic="selection" onPress={() => setSubjectId(s.id)}
                style={[styles.subjectChip, { backgroundColor: subjectId === s.id ? (subjectColors[s.name] ?? accent) : colors.surface }]}>
                <Text style={[type.footnote, { color: subjectId === s.id ? "#fff" : colors.textDim }]}>{s.name}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={styles.controls}>
          <PressableScale haptic="selection" onPress={reset} style={[styles.ctrlGhost, { backgroundColor: colors.surface }]}>
            <Text style={[type.headline, { color: colors.textDim }]}>Reset</Text>
          </PressableScale>
          <PressableScale haptic="light" onPress={running ? pause : start} style={[styles.ctrl, { backgroundColor: accent }]}>
            <Text style={[type.title, { color: "#fff" }]}>{running ? "Pause" : "Start"}</Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, ...bounded },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  count: { fontSize: 80, fontFamily: type.data.fontFamily, fontVariant: ["tabular-nums"], letterSpacing: 1 },
  track: { width: "80%", height: 6, borderRadius: 3, overflow: "hidden", marginTop: spacing.sm },
  fill: { height: "100%", borderRadius: 3 },
  presetRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  preset: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, minWidth: 44, alignItems: "center" },
  subjects: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.xl },
  subjectChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  controls: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  ctrlGhost: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, borderRadius: radius.lg, alignItems: "center" },
  ctrl: { flex: 1, paddingVertical: spacing.lg, borderRadius: radius.lg, alignItems: "center" },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xl },
  doneCta: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.lg },
  doneGhost: { paddingVertical: spacing.sm },
});
