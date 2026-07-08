import { StyleSheet, Text, View } from "react-native";
import type { WeekPlan } from "../engine/week";
import type { PlacedSession } from "../engine/placer/types";
import type { ReflowState } from "../state/model";
import { weakestTopic, unreviewedCorrections } from "../state/model";
import { selectNowState } from "../lib/nowBlock";
import { fmtTime, fmtHours } from "../lib/format";
import { useTheme } from "../theme/theme";
import { spacing, radius, type, subjectColors } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

/**
 * The Now-block — the deterministic, dominant answer to "what do I do right now?".
 * Zero AI, zero network: it reads the placer's plan + the injected wall-clock and
 * always speaks, loudest exactly when the plan is slipping (missed) or absent.
 */
export interface NowBlockProps {
  state: ReflowState;
  plan: WeekPlan;
  nowISO: string;
  nowMinutes: number;
  focusedTodayMin: number;
  onStart: (session: PlacedSession, mission: string) => void;
  onMarkDone: (session: PlacedSession) => void;
  onSkip: (session: PlacedSession) => void;
  onReflect: () => void;
  onSeeWeek: () => void;
  onSetup: () => void;
  onWhy: (session: PlacedSession) => void;
}

const humanIn = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export function NowBlock(props: NowBlockProps) {
  const { colors } = useTheme();
  const { state, plan, nowISO, nowMinutes } = props;
  const now = selectNowState(plan.sessions, state.sessionStatus, nowISO, nowMinutes);
  const nameOf = (id: string) => state.config.subjects.find((s) => s.id === id)?.name ?? id;

  const missionOf = (subjectId: string) => {
    const wt = weakestTopic(state, subjectId);
    const toReview = wt ? unreviewedCorrections(state, subjectId, wt.id) : 0;
    return wt
      ? `${wt.name} · confidence ${wt.confidence}/10${toReview ? ` · ${toReview} to review` : ""}`
      : "Study session";
  };

  const today = plan.sessions.filter((s) => s.date === nowISO);
  const doneToday = today.filter((s) => state.sessionStatus[`${s.date}|${s.subjectId}|${s.interval.start}`] === "done").length;

  // Per-state colour + content.
  const s = now.session;
  const subjColor = s ? subjectColors[nameOf(s.subjectId)] ?? colors.accent : colors.accent;

  const Btn = ({ label, onPress, tone = "primary" }: { label: string; onPress: () => void; tone?: "primary" | "ghost" | "danger" }) => (
    <PressableScale
      haptic={tone === "primary" ? "light" : "selection"}
      onPress={onPress}
      style={[
        styles.btn,
        tone === "primary" && { backgroundColor: "#fff" },
        tone === "ghost" && { backgroundColor: "rgba(255,255,255,0.18)" },
        tone === "danger" && { backgroundColor: "rgba(255,255,255,0.18)" },
      ]}
    >
      <Text style={[type.footnote, { fontWeight: "700", color: tone === "primary" ? subjColor : "#fff" }]}>{label}</Text>
    </PressableScale>
  );

  // Surface-tone block (done/rest/empty) uses a calm card; actionable states use accent.
  const onAccent = now.kind !== "done" && now.kind !== "rest" && now.kind !== "empty";
  const bg = now.kind === "missed" ? colors.warning : onAccent ? subjColor : colors.surface;
  const fg = onAccent ? "#fff" : colors.text;
  const dim = onAccent ? "rgba(255,255,255,0.85)" : colors.textDim;

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: colors.separator, borderWidth: onAccent ? 0 : 1 }]}>
      {now.kind === "upcoming" && s && (
        <>
          <Text style={[type.caption, { color: dim }]}>NEXT · in {humanIn(now.startsInMin ?? 0)}</Text>
          <Text style={[styles.title, { color: fg }]}>{nameOf(s.subjectId)}</Text>
          <Text style={[type.callout, { color: dim }]}>{fmtTime(s.interval.start)} – {fmtTime(s.interval.end)}</Text>
          <Text style={[type.footnote, { color: dim, marginTop: 2 }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Btn label="Start early" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
            <Btn label="Why?" tone="ghost" onPress={() => props.onWhy(s)} />
          </View>
        </>
      )}

      {now.kind === "startingNow" && s && (
        <>
          <Text style={[type.caption, { color: dim }]}>● STARTING NOW</Text>
          <Text style={[styles.title, { color: fg }]}>{nameOf(s.subjectId)}</Text>
          <Text style={[type.footnote, { color: dim }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Btn label={`Start ${nameOf(s.subjectId)}`} onPress={() => props.onStart(s, missionOf(s.subjectId))} />
          </View>
        </>
      )}

      {now.kind === "inProgress" && s && (
        <>
          <Text style={[type.caption, { color: dim }]}>● IN PROGRESS</Text>
          <Text style={[styles.title, { color: fg }]}>{nameOf(s.subjectId)}</Text>
          <Text style={[type.callout, { color: dim }]}>Resume · {now.remainingMin}m left</Text>
          <View style={styles.row}>
            <Btn label="Resume session" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
          </View>
        </>
      )}

      {now.kind === "missed" && s && (
        <>
          <Text style={[type.caption, { color: dim }]}>
            ⚠ MISSED · {nameOf(s.subjectId)} {fmtTime(s.interval.start)}
            {(now.missedCount ?? 0) > 1 ? `  ·  +${(now.missedCount ?? 1) - 1} more` : ""}
          </Text>
          <Text style={[styles.title, { color: fg }]}>Do it now?</Text>
          <Text style={[type.footnote, { color: dim }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Btn label="Start now" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
            <Btn label="Mark done" tone="ghost" onPress={() => props.onMarkDone(s)} />
            <Btn label="Skip" tone="danger" onPress={() => props.onSkip(s)} />
          </View>
        </>
      )}

      {now.kind === "done" && (
        <>
          <Text style={[type.caption, { color: dim }]}>✓ DONE FOR TODAY</Text>
          <Text style={[styles.title, { color: fg }]}>{doneToday}/{today.length} sessions</Text>
          <Text style={[type.callout, { color: dim }]}>{fmtHours(props.focusedTodayMin / 60)} focused · streak safe 🔥 {state.progress.streakDays}</Text>
          <View style={styles.row}>
            <PressableScale haptic="light" onPress={props.onReflect} style={[styles.btn, { backgroundColor: colors.accentSoft }]}>
              <Text style={[type.footnote, { fontWeight: "700", color: colors.accent }]}>Reflect on today</Text>
            </PressableScale>
            <PressableScale haptic="selection" onPress={props.onSeeWeek} style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.separator, borderWidth: 1 }]}>
              <Text style={[type.footnote, { fontWeight: "700", color: colors.textDim }]}>Tomorrow →</Text>
            </PressableScale>
          </View>
        </>
      )}

      {now.kind === "rest" && (
        <>
          <Text style={[type.caption, { color: dim }]}>REST DAY 🌱</Text>
          <Text style={[styles.title, { color: fg }]}>The plan gives you today off.</Text>
          <Text style={[type.footnote, { color: dim }]}>Recovery is part of the schedule. Back at it tomorrow.</Text>
          <View style={styles.row}>
            <PressableScale haptic="selection" onPress={props.onSeeWeek} style={[styles.btn, { backgroundColor: colors.accentSoft }]}>
              <Text style={[type.footnote, { fontWeight: "700", color: colors.accent }]}>See the week →</Text>
            </PressableScale>
          </View>
        </>
      )}

      {now.kind === "empty" && (
        <>
          <Text style={[type.caption, { color: dim }]}>NO SESSIONS YET</Text>
          <Text style={[styles.title, { color: fg }]}>Nothing scheduled.</Text>
          <Text style={[type.footnote, { color: dim }]}>Add your subjects and exams and I'll build the plan.</Text>
          <View style={styles.row}>
            <PressableScale haptic="light" onPress={props.onSetup} style={[styles.btn, { backgroundColor: colors.accent }]}>
              <Text style={[type.footnote, { fontWeight: "700", color: "#fff" }]}>Set up subjects</Text>
            </PressableScale>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.lg, minHeight: 180, justifyContent: "center", gap: 4 },
  title: { fontFamily: type.hero.fontFamily, fontSize: 30, lineHeight: 34, marginVertical: 2 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  btn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
