import type { DayTemplate, WeekInput } from "../engine/week";
import type { SubjectSignals } from "../engine/allocator/types";
import { IAL_EXAMS_2027 } from "../data/ial-exams-2027";
import { effectiveConfidence, EXAM_SUBJECT, type StudySubject } from "../data/subjects";

const DAY_MS = 86_400_000;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (fromISO: string, toISO: string) =>
  Math.round((Date.parse(toISO) - Date.parse(fromISO)) / DAY_MS);

/** Days until a subject's nearest UPCOMING unit exam (null once all are past). */
export function daysToNearestExam(subjectId: string, refISO: string): number | null {
  const examSubject = EXAM_SUBJECT[subjectId];
  const upcoming = IAL_EXAMS_2027
    .filter((e) => e.subject === examSubject && Date.parse(e.date) >= Date.parse(refISO))
    .map((e) => daysBetween(refISO, e.date))
    .sort((a, b) => a - b);
  return upcoming.length ? upcoming[0]! : null;
}

/** Per-weekday (0=Sun..6=Sat) study windows, in minutes-from-midnight. */
export type AvailabilityTemplate = Record<number, { start: number; end: number }[]>;

/** Build a 7-day WeekInput from subjects + the availability template + timetable. */
export function buildWeekInput(opts: {
  refDateISO: string;
  subjects: StudySubject[];
  availability: AvailabilityTemplate;
  weeklyGoalHours: number;
  /** Per-weekday recurring fixed commitments (classes, labs). */
  commitments?: AvailabilityTemplate;
  /** One-off blocks keyed by exact date (YYYY-MM-DD). */
  blocks?: Record<string, { start: number; end: number }[]>;
  /** Per-subject past-paper performance 0..1 (lower = worse), or null. */
  performance?: Record<string, number | null>;
  slotMinutes?: number;
  examWindowDays?: number;
}): WeekInput {
  const slotMinutes = opts.slotMinutes ?? 30;
  const config = {
    examWindowDays: opts.examWindowDays ?? 14,
    maintenanceFloorFraction: 0.3,
  };

  const start = new Date(opts.refDateISO + "T00:00:00Z");
  const days: DayTemplate[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const wd = d.getUTCDay();
    const date = iso(d);
    days.push({
      date,
      availability: (opts.availability[wd] ?? []).map((w) => ({ ...w })),
      commitments: (opts.commitments?.[wd] ?? []).map((w) => ({ ...w })),
      blocks: (opts.blocks?.[date] ?? []).map((w) => ({ ...w })),
    });
  }

  const subjects: SubjectSignals[] = opts.subjects.map((s) => ({
    subjectId: s.id,
    daysToExam: daysToNearestExam(s.id, opts.refDateISO),
    avgConfidence: effectiveConfidence(s),
    performanceScore: opts.performance?.[s.id] ?? null,
  }));

  return { days, subjects, config, weeklyGoalHours: opts.weeklyGoalHours, slotMinutes };
}

/** Preset study windows the availability editor toggles (minutes from midnight). */
export const AVAILABILITY_PRESETS = [
  { key: "morning", label: "Morning", start: 540, end: 720 }, // 9–12
  { key: "afternoon", label: "Afternoon", start: 780, end: 1020 }, // 1–5
  { key: "evening", label: "Evening", start: 1020, end: 1260 }, // 5–9
] as const;

const PRESET = Object.fromEntries(AVAILABILITY_PRESETS.map((p) => [p.key, { start: p.start, end: p.end }]));

/** A sensible default weekly canvas: weekday evenings + weekend days (~34h). */
export const DEFAULT_AVAILABILITY: AvailabilityTemplate = {
  1: [PRESET.evening!],
  2: [PRESET.evening!],
  3: [PRESET.evening!],
  4: [PRESET.evening!],
  5: [PRESET.evening!],
  6: [PRESET.morning!, PRESET.afternoon!],
  0: [PRESET.morning!, PRESET.afternoon!],
};
