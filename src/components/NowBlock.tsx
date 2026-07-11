import { StyleSheet, Text, View } from "react-native";
import type { WeekPlan } from "../engine/week";
import type { PlacedSession } from "../engine/placer/types";
import type { ReflowState } from "../state/model";
import { weakestTopic, unreviewedCorrections } from "../state/model";
import { selectNowState } from "../lib/nowBlock";
import { fmtTime, fmtHours } from "../lib/format";
import { useTheme } from "../theme/theme";
import { spacing, radius, type } from "../theme/tokens";
import { PressableScale } from "./PressableScale";
import { Surface } from "./Surface";

/**
 * The Now-block — the deterministic, dominant answer to "what do I do right now?".
 * Zero AI, zero network: it reads the placer's plan + the injected wall-clock and
 * always speaks, loudest exactly when the plan is slipping (missed) or absent.
 *
 * Nothing re-skin: one flat monochrome Surface for every state — emphasis comes
 * from Doto numerals and typography, never colour. Signal-red is spent only on
 * the states that are genuine signals: live (starting/in-progress) and overdue
 * (missed), marked by a filled accent dot + accentText label.
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

  // Signal-dot label row (live / overdue). `signal` lights the dot + label red.
  const Label = ({ text, signal = false }: { text: string; signal?: boolean }) => (
    <View style={styles.labelRow}>
      {signal && <View style={[styles.sigDot, { backgroundColor: colors.accent }]} />}
      <Text style={[type.caption, { color: signal ? colors.accentText : colors.textDim }]}>{text}</Text>
    </View>
  );

  // Buttons: primary inverts (display fill + bg text); ghost is a bordered
  // outline; danger keeps the outline but speaks in accentText.
  const Btn = ({ label, onPress, tone = "primary" }: { label: string; onPress: () => void; tone?: "primary" | "ghost" | "danger" }) => (
    <PressableScale
      haptic={tone === "primary" ? "light" : "selection"}
      onPress={onPress}
      style={[
        styles.btn,
        {
          backgroundColor: tone === "primary" ? colors.display : "transparent",
          borderColor: tone === "primary" ? colors.display : colors.line2,
          borderWidth: 1,
        },
      ]}
    >
      <Text style={[type.mono, { color: tone === "primary" ? colors.bg : tone === "danger" ? colors.accentText : colors.text }]}>
        {label.toUpperCase()}
      </Text>
    </PressableScale>
  );

  return (
    <Surface style={styles.card}>
      {now.kind === "upcoming" && s && (
        <>
          <View style={styles.labelRow}>
            <Text style={[type.caption, { color: colors.textDim }]}>NEXT · IN </Text>
            <Text style={[type.data, { color: colors.text }]}>{humanIn(now.startsInMin ?? 0)}</Text>
          </View>
          <Text style={[type.title, { color: colors.text }]}>{nameOf(s.subjectId)}</Text>
          <Text style={[type.data, { color: colors.textDim }]}>{fmtTime(s.interval.start)} – {fmtTime(s.interval.end)}</Text>
          <Text style={[type.footnote, { color: colors.textDim, marginTop: 2 }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Btn label="Start early" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
            <Btn label="Why?" tone="ghost" onPress={() => props.onWhy(s)} />
          </View>
        </>
      )}

      {now.kind === "startingNow" && s && (
        <>
          <Label text="STARTING NOW" signal />
          <Text style={[type.title, { color: colors.text }]}>{nameOf(s.subjectId)}</Text>
          <Text style={[type.footnote, { color: colors.textDim }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Btn label={`Start ${nameOf(s.subjectId)}`} onPress={() => props.onStart(s, missionOf(s.subjectId))} />
          </View>
        </>
      )}

      {now.kind === "inProgress" && s && (
        <>
          <Label text="IN PROGRESS" signal />
          <Text style={[type.title, { color: colors.text }]}>{nameOf(s.subjectId)}</Text>
          <View style={styles.labelRow}>
            <Text style={[type.mono, { color: colors.textDim }]}>RESUME · </Text>
            <Text style={[type.data, { color: colors.text }]}>{now.remainingMin}m left</Text>
          </View>
          <View style={styles.row}>
            <Btn label="Resume session" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
          </View>
        </>
      )}

      {now.kind === "missed" && s && (
        <>
          <Label
            text={`MISSED · ${nameOf(s.subjectId)} ${fmtTime(s.interval.start)}${(now.missedCount ?? 0) > 1 ? `  ·  +${(now.missedCount ?? 1) - 1} more` : ""}`}
            signal
          />
          <Text style={[type.title, { color: colors.text }]}>Do it now?</Text>
          <Text style={[type.footnote, { color: colors.textDim }]} numberOfLines={1}>{missionOf(s.subjectId)}</Text>
          <View style={styles.row}>
            <Btn label="Start now" onPress={() => props.onStart(s, missionOf(s.subjectId))} />
            <Btn label="Mark done" tone="ghost" onPress={() => props.onMarkDone(s)} />
            <Btn label="Skip" tone="danger" onPress={() => props.onSkip(s)} />
          </View>
        </>
      )}

      {now.kind === "done" && (
        <>
          <View style={styles.labelRow}>
            <View style={[styles.sigDot, { backgroundColor: colors.display }]} />
            <Text style={[type.caption, { color: colors.textDim }]}>DONE FOR TODAY</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
            <Text style={[type.numeral, { color: colors.text }]}>{doneToday}/{today.length}</Text>
            <Text style={[type.mono, { color: colors.textDim }]}>SESSIONS</Text>
          </View>
          <Text style={[type.data, { color: colors.textDim }]}>{fmtHours(props.focusedTodayMin / 60)} focused · streak {state.progress.streakDays}</Text>
          <View style={styles.row}>
            <Btn label="Reflect on today" onPress={props.onReflect} />
            <Btn label="Tomorrow →" tone="ghost" onPress={props.onSeeWeek} />
          </View>
        </>
      )}

      {now.kind === "rest" && (
        <>
          <Text style={[type.caption, { color: colors.textDim }]}>REST DAY</Text>
          <Text style={[type.title, { color: colors.text }]}>The plan gives you today off.</Text>
          <Text style={[type.footnote, { color: colors.textDim }]}>Recovery is part of the schedule. Back at it tomorrow.</Text>
          <View style={styles.row}>
            <Btn label="See the week →" onPress={props.onSeeWeek} />
          </View>
        </>
      )}

      {now.kind === "empty" && (
        <>
          <Text style={[type.caption, { color: colors.textDim }]}>NO SESSIONS YET</Text>
          <Text style={[type.title, { color: colors.text }]}>Nothing scheduled.</Text>
          <Text style={[type.footnote, { color: colors.textDim }]}>Add your subjects and exams and I'll build the plan.</Text>
          <View style={styles.row}>
            <Btn label="Set up subjects" onPress={props.onSetup} />
          </View>
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 180, justifyContent: "center", gap: 4 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  btn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sigDot: { width: 7, height: 7, borderRadius: 3.5 },
});
