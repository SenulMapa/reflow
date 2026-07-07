import type { DayTemplate, WeekInput } from "../engine/week";
import type { SubjectSignals } from "../engine/allocator/types";
import { IAL_EXAMS_2027 } from "../data/ial-exams-2027";
import { EXAM_SUBJECT, type StudySubject } from "../data/subjects";

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
    days.push({
      date: iso(d),
      availability: (opts.availability[wd] ?? []).map((w) => ({ ...w })),
      commitments: [],
      blocks: [],
    });
  }

  const subjects: SubjectSignals[] = opts.subjects.map((s) => ({
    subjectId: s.id,
    daysToExam: daysToNearestExam(s.id, opts.refDateISO),
    avgConfidence: s.confidence,
    performanceScore: null,
  }));

  return { days, subjects, config, weeklyGoalHours: opts.weeklyGoalHours, slotMinutes };
}

/** A sensible default weekly canvas: weekday evenings + weekend blocks. */
export const DEFAULT_AVAILABILITY: AvailabilityTemplate = {
  1: [{ start: 1020, end: 1260 }], // Mon 17:00–21:00
  2: [{ start: 1020, end: 1260 }],
  3: [{ start: 1020, end: 1260 }],
  4: [{ start: 1020, end: 1260 }],
  5: [{ start: 1020, end: 1260 }], // Fri
  6: [ // Sat
    { start: 600, end: 780 }, // 10:00–13:00
    { start: 840, end: 1080 }, // 14:00–18:00
  ],
  0: [ // Sun
    { start: 600, end: 780 },
    { start: 840, end: 1080 },
  ],
};
