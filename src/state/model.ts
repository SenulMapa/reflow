import type { Interval } from "../engine/types";
import { planWeek, type WeekPlan } from "../engine/week";
import {
  buildWeekInput,
  DEFAULT_AVAILABILITY,
  type AvailabilityTemplate,
} from "../lib/buildWeek";
import { DEMO_SUBJECTS, type StudySubject, type Topic } from "../data/subjects";

/**
 * Pure app state + reducers. No React, no storage, no I/O — so the whole state
 * layer is unit-testable and the same logic runs under any UI/persistence shell.
 */
export interface ReflowConfig {
  subjects: StudySubject[];
  availability: AvailabilityTemplate; // per weekday (0=Sun..6=Sat)
  commitments: AvailabilityTemplate; // per weekday: fixed classes/labs
  weeklyGoalHours: number;
  slotMinutes: number;
  examWindowDays: number;
}

export interface WeekState {
  refDateISO: string;
  /** One-off blocks keyed by exact date (YYYY-MM-DD). */
  blocks: Record<string, Interval[]>;
}

/** A Correction Booklet entry — a logged mistake + its fix, tied to a topic. */
export interface Correction {
  id: string;
  subjectId: string;
  topicId?: string;
  mistake: string;
  fix: string;
  date: string;
  reviewed: boolean;
}

/** A logged past-paper attempt — feeds the allocator's performance signal. */
export interface PastPaper {
  id: string;
  subjectId: string;
  year: number;
  month: string; // e.g. "May", "Jan"
  variant: string; // e.g. "WMA11/01"
  scorePct: number | null; // 0..100
  weakChapters: string[];
  date: string;
}

/** A completed focus/pomodoro session — owned metrics that feed insights. */
export interface FocusSession {
  id: string;
  subjectId?: string;
  date: string;
  minutes: number;
}

export interface ReflowState {
  config: ReflowConfig;
  week: WeekState;
  corrections: Correction[];
  pastPapers: PastPaper[];
  focusSessions: FocusSession[];
}

export function initialState(refDateISO: string): ReflowState {
  return {
    config: {
      subjects: DEMO_SUBJECTS.map((s) => ({ ...s, topics: s.topics?.map((t) => ({ ...t })) })),
      availability: DEFAULT_AVAILABILITY,
      commitments: {},
      weeklyGoalHours: 24,
      slotMinutes: 30,
      examWindowDays: 14,
    },
    week: { refDateISO, blocks: {} },
    corrections: [],
    pastPapers: [],
    focusSessions: [],
  };
}

// ── Reducers (pure: return a new state) ─────────────────────────────────────

const withConfig = (s: ReflowState, patch: Partial<ReflowConfig>): ReflowState => ({
  ...s,
  config: { ...s.config, ...patch },
});

export const setWeeklyGoal = (s: ReflowState, hours: number): ReflowState =>
  withConfig(s, { weeklyGoalHours: Math.max(0, hours) });

export const setSlotMinutes = (s: ReflowState, slotMinutes: number): ReflowState =>
  withConfig(s, { slotMinutes });

export function addSubject(s: ReflowState, subject: StudySubject): ReflowState {
  if (s.config.subjects.some((x) => x.id === subject.id)) return s;
  return withConfig(s, { subjects: [...s.config.subjects, subject] });
}

export const removeSubject = (s: ReflowState, id: string): ReflowState =>
  withConfig(s, { subjects: s.config.subjects.filter((x) => x.id !== id) });

export const setConfidence = (s: ReflowState, id: string, confidence: number): ReflowState =>
  withConfig(s, {
    subjects: s.config.subjects.map((x) =>
      x.id === id ? { ...x, confidence: clamp(confidence, 1, 10) } : x
    ),
  });

export const setAvailability = (
  s: ReflowState,
  weekday: number,
  windows: Interval[]
): ReflowState =>
  withConfig(s, { availability: { ...s.config.availability, [weekday]: windows } });

export function addBlock(s: ReflowState, date: string, block: Interval): ReflowState {
  const existing = s.week.blocks[date] ?? [];
  return {
    ...s,
    week: { ...s.week, blocks: { ...s.week.blocks, [date]: [...existing, block] } },
  };
}

export function removeBlock(s: ReflowState, date: string, index: number): ReflowState {
  const existing = s.week.blocks[date] ?? [];
  const next = existing.filter((_, i) => i !== index);
  const blocks = { ...s.week.blocks };
  if (next.length) blocks[date] = next;
  else delete blocks[date];
  return { ...s, week: { ...s.week, blocks } };
}

export const clearBlocks = (s: ReflowState): ReflowState => ({
  ...s,
  week: { ...s.week, blocks: {} },
});

export const setRefDate = (s: ReflowState, refDateISO: string): ReflowState => ({
  ...s,
  week: { ...s.week, refDateISO },
});

// ── Topics + Correction Booklet (the weakness loop) ─────────────────────────

export function addTopic(s: ReflowState, subjectId: string, topic: Topic): ReflowState {
  return withConfig(s, {
    subjects: s.config.subjects.map((subj) =>
      subj.id === subjectId ? { ...subj, topics: [...(subj.topics ?? []), topic] } : subj
    ),
  });
}

export function setTopicConfidence(
  s: ReflowState,
  subjectId: string,
  topicId: string,
  confidence: number
): ReflowState {
  return withConfig(s, {
    subjects: s.config.subjects.map((subj) =>
      subj.id === subjectId
        ? {
            ...subj,
            topics: subj.topics?.map((t) =>
              t.id === topicId ? { ...t, confidence: clamp(confidence, 1, 10) } : t
            ),
          }
        : subj
    ),
  });
}

function topicConfidence(s: ReflowState, subjectId: string, topicId: string): number | undefined {
  return s.config.subjects
    .find((x) => x.id === subjectId)
    ?.topics?.find((t) => t.id === topicId)?.confidence;
}

/** Log a correction; if tied to a topic, drop that topic's confidence by 1. */
export function addCorrection(s: ReflowState, correction: Correction): ReflowState {
  const lowered = correction.topicId
    ? setTopicConfidence(
        s,
        correction.subjectId,
        correction.topicId,
        (topicConfidence(s, correction.subjectId, correction.topicId) ?? 5) - 1
      )
    : s;
  return { ...lowered, corrections: [correction, ...lowered.corrections] };
}

export const toggleCorrectionReviewed = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  corrections: s.corrections.map((c) => (c.id === id ? { ...c, reviewed: !c.reviewed } : c)),
});

export const removeCorrection = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  corrections: s.corrections.filter((c) => c.id !== id),
});

// ── Past papers → performance signal (the macro half of the loop) ───────────

export function addPastPaper(s: ReflowState, paper: PastPaper): ReflowState {
  return { ...s, pastPapers: [paper, ...s.pastPapers] };
}

export const removePastPaper = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  pastPapers: s.pastPapers.filter((p) => p.id !== id),
});

/** Performance 0..1 for a subject = mean of its recent scored papers, or null. */
export function subjectPerformance(s: ReflowState, subjectId: string, recent = 5): number | null {
  const scored = s.pastPapers
    .filter((p) => p.subjectId === subjectId && p.scorePct != null)
    .slice(0, recent);
  if (!scored.length) return null;
  return scored.reduce((t, p) => t + (p.scorePct ?? 0), 0) / scored.length / 100;
}

export function performanceMap(s: ReflowState): Record<string, number | null> {
  return Object.fromEntries(
    s.config.subjects.map((subj) => [subj.id, subjectPerformance(s, subj.id)])
  );
}

// ── Focus sessions (Phase 4) ────────────────────────────────────────────────

export function addFocusSession(s: ReflowState, session: FocusSession): ReflowState {
  return { ...s, focusSessions: [session, ...s.focusSessions] };
}

/** Total focused minutes logged for a given ISO date. */
export function focusMinutesOn(s: ReflowState, date: string): number {
  return s.focusSessions.filter((f) => f.date === date).reduce((t, f) => t + f.minutes, 0);
}

// ── Selector ────────────────────────────────────────────────────────────────

export function computePlan(s: ReflowState): WeekPlan {
  const { config, week } = s;
  return planWeek(
    buildWeekInput({
      refDateISO: week.refDateISO,
      subjects: config.subjects,
      availability: config.availability,
      commitments: config.commitments,
      blocks: week.blocks,
      performance: performanceMap(s),
      weeklyGoalHours: config.weeklyGoalHours,
      slotMinutes: config.slotMinutes,
      examWindowDays: config.examWindowDays,
    })
  );
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
