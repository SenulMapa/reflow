import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import {
  DEFAULT_POMODORO,
  fmtCountdown,
  isComplete,
  nextPhase,
  phaseDurationMs,
  remainingMs,
  type Phase,
} from "../src/lib/pomodoro";

const config = DEFAULT_POMODORO;
const todayISO = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function Timer() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const addFocusSession = useStore((s) => s.addFocusSession);

  const subjects = state.config.subjects;
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [accum, setAccum] = useState(0);
  const startedAt = useRef<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(iv);
  }, [running]);

  const now = Date.now();
  const elapsed = accum + (running && startedAt.current ? now - startedAt.current : 0);
  const remaining = remainingMs(config, phase, elapsed);
  const progress = 1 - remaining / phaseDurationMs(config, phase);

  // Handle phase completion.
  useEffect(() => {
    if (!running || !isComplete(config, phase, elapsed)) return;
    if (phase === "focus") {
      addFocusSession({ id: `${Date.now()}`, subjectId, date: todayISO(), minutes: config.focusMin });
    }
    setPhase(nextPhase(phase));
    setAccum(0);
    startedAt.current = Date.now();
  }, [elapsed, running, phase]);

  const start = () => {
    startedAt.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    setAccum(elapsed);
    startedAt.current = null;
    setRunning(false);
  };
  const reset = () => {
    setRunning(false);
    setPhase("focus");
    setAccum(0);
    startedAt.current = null;
  };

  const accent = phase === "focus" ? colors.accent : colors.success;
  const focusedToday = state.focusSessions
    .filter((f) => f.date === todayISO())
    .reduce((t, f) => t + f.minutes, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Link href="/" asChild>
            <Pressable hitSlop={10}>
              <Text style={[type.headline, { color: colors.accent }]}>‹ Week</Text>
            </Pressable>
          </Link>
          <Text style={[type.footnote, { color: colors.textDim }]}>{Math.round(focusedToday)}m focused today</Text>
        </View>

        <View style={styles.center}>
          <Text style={[type.caption, { color: accent, letterSpacing: 2 }]}>
            {phase === "focus" ? "FOCUS" : "BREAK"}
          </Text>
          <Text style={[styles.count, { color: colors.text }]}>{fmtCountdown(remaining)}</Text>

          <View style={[styles.track, { backgroundColor: colors.separator }]}>
            <View style={[styles.fill, { backgroundColor: accent, width: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
          </View>

          {/* Subject */}
          <View style={styles.subjects}>
            <Pressable
              onPress={() => setSubjectId(undefined)}
              style={[styles.subjectChip, { backgroundColor: subjectId === undefined ? accent : colors.surface }]}
            >
              <Text style={[type.footnote, { color: subjectId === undefined ? "#fff" : colors.textDim }]}>General</Text>
            </Pressable>
            {subjects.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSubjectId(s.id)}
                style={[styles.subjectChip, { backgroundColor: subjectId === s.id ? (subjectColors[s.name] ?? accent) : colors.surface }]}
              >
                <Text style={[type.footnote, { color: subjectId === s.id ? "#fff" : colors.textDim }]}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={reset} style={[styles.ctrlGhost, { backgroundColor: colors.surface }]}>
            <Text style={[type.headline, { color: colors.textDim }]}>Reset</Text>
          </Pressable>
          <Pressable onPress={running ? pause : start} style={[styles.ctrl, { backgroundColor: accent }]}>
            <Text style={[type.title, { color: "#fff" }]}>{running ? "Pause" : "Start"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: spacing.lg },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  count: { fontSize: 84, fontWeight: "200", fontVariant: ["tabular-nums"], letterSpacing: 2 },
  track: { width: "80%", height: 6, borderRadius: 3, overflow: "hidden", marginTop: spacing.sm },
  fill: { height: "100%", borderRadius: 3 },
  subjects: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.xl },
  subjectChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  controls: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  ctrlGhost: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, borderRadius: radius.lg, alignItems: "center" },
  ctrl: { flex: 1, paddingVertical: spacing.lg, borderRadius: radius.lg, alignItems: "center" },
});
