import type { Interval } from "../types";

/** A single day's free study windows (availability − commitments − blocks). */
export interface DayAvailability {
  date: string;
  free: Interval[];
}

/** How many hours a subject should get this week (from the Allocator). */
export interface SubjectDemand {
  subjectId: string;
  hours: number;
}

export interface PlacerInput {
  days: DayAvailability[];
  demands: SubjectDemand[];
  /** Placement granularity in minutes (e.g. 30). */
  slotMinutes: number;
}

export interface PlacedSession {
  date: string;
  subjectId: string;
  interval: Interval;
}

export interface PlacerOutput {
  sessions: PlacedSession[];
  /** Hours that could not fit anywhere this week, per subject (shortfall). */
  unplacedHours: Record<string, number>;
}
