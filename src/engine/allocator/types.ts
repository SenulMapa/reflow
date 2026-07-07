/**
 * Allocator types. The Allocator DERIVES how many hours each subject gets this
 * week from live signals — it does not read a hand-typed budget. Its output is
 * fed to the Placer, which drops those hours into the calendar.
 */

export interface AllocatorConfig {
  /** Days before an exam at which a subject is considered "in its exam window". */
  examWindowDays: number;
  /** Floor for a subject's share as a fraction of its fair equal share (0..1). */
  maintenanceFloorFraction: number;
}

/** The per-subject signals the Allocator reasons over for a given week. */
export interface SubjectSignals {
  subjectId: string;
  /** Days until this subject's nearest upcoming exam, or null if none scheduled. */
  daysToExam: number | null;
  /** Mean topic confidence 1..10 (LOWER = weaker = needs more time). */
  avgConfidence: number;
  /**
   * Recent past-paper performance 0..1 (LOWER = doing worse = needs more time),
   * or null when there is no past-paper data yet (Phase 3 signal).
   */
  performanceScore: number | null;
  /** Optional MiniMax-supplied priority multiplier (>0, default 1). */
  llmWeight?: number;
  /**
   * If set, the user has PINNED this subject to exactly this many hours; the
   * Allocator must honor it and distribute the remainder among the rest.
   */
  pinnedHours?: number;
}

export interface AllocatorInput {
  /** Total study hours available this week (from the availability template). */
  totalAvailableHours: number;
  subjects: SubjectSignals[];
  config: AllocatorConfig;
}

export interface SubjectAllocation {
  subjectId: string;
  hours: number;
  /** Human-readable "why this subject got this share" for transparency. */
  rationale: string;
}

export interface AllocatorOutput {
  allocations: SubjectAllocation[];
}
