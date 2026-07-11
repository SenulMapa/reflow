import { StyleSheet, Text, View } from "react-native";
import type { WeekPlan } from "../engine/week";
import type { PlacedSession } from "../engine/placer/types";
import type { ReflowState } from "../state/model";
import { weakestTopic, unreviewedCorrections } from "../state/model";
import { selectNowState } from "../lib/nowBlock";
import { fmtTime, fmtHours } from "../lib/format";
import { useTheme } from "../theme/theme";
import { spacing, type } from "../theme/tokens";
import { PressableScale } from "./PressableScale";
import { Pill } from "./Pill";
import { Surface } from "./Surface";

/**
 * The Now-block — the deterministic, dominant answer to "what do I do right now?".
 * Zero AI, zero network: it reads the placer's plan + the injected wall-clock and
 * always speaks, loudest exactly when the plan is slipping (missed) or absent.
 *
 * Calm-Nothing re-skin: one flat hairline Surface for every state. Emphasis comes
 * from a single DotGothic16 hero numeral (the scheduled time / countdown) and the
 * one full-pill primary action per state — never colour. Red is spent only on the
 * live "NOW" indicator dot; the live/overdue primary action earns the signal-red
 * pill (≤2 red at once). "MISSED"/"SKIP" are words, so they read grey.
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

  const s = now.session;

  // Signal-dot label row. The dot is the ONE live-red mark; the label word itself
  // always reads grey (so "MISSED" is information, never an alarm colour).
  const Label = ({ text, signal = false, dotColor }: { text: string; signal?: boolean; dotColor?: string }) => (
    <View style={styles.labelRow}>
      {(signal || dotColor) && <View style={[styles.sigDot, { backgroundColor: dotColor ?? colors.accent }]} />}
      <Text style={[type.caption, { color: colors.textDim }]}>{text}</Text>
    </View>
  );

  // Secondary actions are plain, calm mono text buttons — never a second pill,
  // never red. One Pill per state carries the "press me" weight.
  const TextBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <PressableScale haptic="selection" onPress={onPress} style={styles.textBtn}>
      <Text style={[type.mono, { color: colors.textDim }]}>{label.toUpperCase()}</Text>
    </PressableScale>
  );

  // The hero numeral — a single DotGothic16 clock/countdown, full contrast.
  const Hero = ({ value, unit }: { value: string; unit?: string }) => (
    <View style={styles.heroRow}>
      <Text style={[type.numeral, { color: colors.text }]}>{value}</Text>
      {unit && <Text style={[type.mono, { color: colors.textDim, marginBottom: 8 }]}>{unit}</Text>}
    </View>
  );

  return (
    <Surface style={styles.card}>
      {now.kind === "upcoming" && s && (
        <>
          <Label text={`NEXT · IN ${humanIn(now.startsInMin ?? 0)}`} />
          <Hero value={fmtTime(s.interval.start)} />
          <Text style={[type.title, { color: colors.text }]}>{nameOf(s.subjectId)}</Text>
          <Text style={[type.footnote, { color: colors.textDim, marginTop: 2 }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Pill label="Start early" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
            <TextBtn label="Why?" onPress={() => props.onWhy(s)} />
          </View>
        </>
      )}

      {now.kind === "startingNow" && s && (
        <>
          <Label text="STARTING NOW" signal />
          <Hero value={fmtTime(s.interval.start)} />
          <Text style={[type.title, { color: colors.text }]}>{nameOf(s.subjectId)}</Text>
          <Text style={[type.footnote, { color: colors.textDim }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Pill label={`Start ${nameOf(s.subjectId)}`} tone="signal" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
          </View>
        </>
      )}

      {now.kind === "inProgress" && s && (
        <>
          <Label text="IN PROGRESS" signal />
          <Hero value={`${now.remainingMin}`} unit="MIN LEFT" />
          <Text style={[type.title, { color: colors.text }]}>{nameOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Pill label="Resume session" tone="signal" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
          </View>
        </>
      )}

      {now.kind === "missed" && s && (
        <>
          <Label
            text={`MISSED · ${nameOf(s.subjectId)}${(now.missedCount ?? 0) > 1 ? `  ·  +${(now.missedCount ?? 1) - 1} more` : ""}`}
            signal
          />
          <Hero value={fmtTime(s.interval.start)} />
          <Text style={[type.title, { color: colors.text }]}>Do it now?</Text>
          <Text style={[type.footnote, { color: colors.textDim }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Pill label="Start now" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
            <TextBtn label="Mark done" onPress={() => props.onMarkDone(s)} />
            <TextBtn label="Skip" onPress={() => props.onSkip(s)} />
          </View>
        </>
      )}

      {now.kind === "done" && (
        <>
          <Label text="DONE FOR TODAY" dotColor={colors.display} />
          <Hero value={`${doneToday}/${today.length}`} unit="SESSIONS" />
          <Text style={[type.data, { color: colors.textDim }]}>{fmtHours(props.focusedTodayMin / 60)} focused · streak {state.progress.streakDays}</Text>
          <View style={styles.row}>
            <Pill label="Reflect on today" onPress={props.onReflect} />
            <TextBtn label="Tomorrow →" onPress={props.onSeeWeek} />
          </View>
        </>
      )}

      {now.kind === "rest" && (
        <>
          <Text style={[type.caption, { color: colors.textDim }]}>REST DAY</Text>
          <Text style={[type.title, { color: colors.text, marginTop: 2 }]}>The plan gives you today off.</Text>
          <Text style={[type.footnote, { color: colors.textDim }]}>Recovery is part of the schedule. Back at it tomorrow.</Text>
          <View style={styles.row}>
            <Pill label="See the week →" onPress={props.onSeeWeek} />
          </View>
        </>
      )}

      {now.kind === "empty" && (
        <>
          <Text style={[type.caption, { color: colors.textDim }]}>NO SESSIONS YET</Text>
          <Text style={[type.title, { color: colors.text, marginTop: 2 }]}>Nothing scheduled.</Text>
          <Text style={[type.footnote, { color: colors.textDim }]}>Add your subjects and exams and I'll build the plan.</Text>
          <View style={styles.row}>
            <Pill label="Set up subjects" onPress={props.onSetup} />
          </View>
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 200, justifyContent: "center", gap: spacing.xs },
  heroRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, marginVertical: 2 },
  row: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg, flexWrap: "wrap", alignItems: "center" },
  textBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  labelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sigDot: { width: 7, height: 7, borderRadius: 3.5 },
});
