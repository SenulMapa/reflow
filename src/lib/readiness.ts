/**
 * Honest readiness — the "layered trust" surface. Present-tense, auditable, and
 * NEVER a predicted grade: a claim about where your preparation IS, not where it
 * will land. Pure functions over already-persisted state (caller injects dates),
 * so the whole thing is unit-testable and keeps the engine clock-free.
 */
import type { ReflowState } from "../state/model";
import { subjectPerformance } from "../state/model";
import type { StudySubject } from "../data/subjects";
import type { SubjectAllocation } from "../engine/allocator/types";
import type { WeekPlan } from "../engine/week";

/**
 * Per-subject focused minutes banked across a set of ISO dates (the current week).
 * "General" (no subjectId) sessions belong to no subject and are excluded.
 */
export function bankedMinutesBySubject(
  state: ReflowState,
  weekDates: string[]
): Record<string, number> {
  const inWeek = new Set(weekDates);
  const out: Record<string, number> = {};
  for (const f of state.focusSessions) {
    if (!f.subjectId || !inWeek.has(f.date)) continue;
    out[f.subjectId] = (out[f.subjectId] ?? 0) + f.minutes;
  }
  return out;
}

/**
 * Coverage 0..1 — the fraction of a subject's topics the student is confident in
 * (topic confidence >= `confidentAt`, on the 1..10 scale). With no topics yet, it
 * falls back to the subject's own confidence vs the threshold.
 */
export function coverageOf(subject: StudySubject, confidentAt = 6): number {
  const topics = subject.topics;
  if (topics && topics.length > 0) {
    const confident = topics.filter((t) => t.confidence >= confidentAt).length;
    return confident / topics.length;
  }
  return subject.confidence >= confidentAt ? 1 : 0;
}

// ── The readiness index ─────────────────────────────────────────────────────

export type DataStrength = "thin" | "ok" | "solid";
export type Trend = 1 | 0 | -1 | null;

export interface SubjectReadiness {
  subjectId: string;
  /** false ⇒ render "not enough signal yet", never a number or arrow. */
  enough: boolean;
  readiness: number | null; // 0..1, null when !enough
  performance: number | null; // mean recent past-paper %/100
  coverage: number; // 0..1
  pace: number; // 0..1, banked vs allocated this week
  trend: Trend; // only rendered when dataStrength >= "ok"
  dataStrength: DataStrength;
  // auditable receipt inputs:
  papers: number;
  bankedHours: number;
  allocatedHours: number;
  confidentTopics: number;
  totalTopics: number;
}

const sign = (n: number): Trend => (n > 0 ? 1 : n < 0 ? -1 : 0);

/**
 * Honest readiness for one subject. Weights: 40% performance, 35% coverage,
 * 25% pace. With ZERO scored papers we refuse to show a number (`enough=false`)
 * — the honest output is silence plus "log a past paper", which is also exactly
 * the data the allocator needs. Never a grade, never a date.
 */
export function subjectReadiness(
  state: ReflowState,
  subjectId: string,
  allocations: SubjectAllocation[],
  weekDates: string[],
  recentPapers = 5
): SubjectReadiness {
  const subject = state.config.subjects.find((s) => s.id === subjectId);
  const topics = subject?.topics ?? [];
  const confidentTopics = topics.filter((t) => t.confidence >= 6).length;
  const totalTopics = topics.length;

  const scored = state.pastPapers
    .filter((p) => p.subjectId === subjectId && p.scorePct != null)
    .slice(0, recentPapers);
  const papers = scored.length;

  const performance = subjectPerformance(state, subjectId, recentPapers);
  const coverage = subject ? coverageOf(subject) : 0;

  const allocatedHours = allocations.find((a) => a.subjectId === subjectId)?.hours ?? 0;
  const bankedHours = (bankedMinutesBySubject(state, weekDates)[subjectId] ?? 0) / 60;
  const pace = allocatedHours > 0 ? Math.min(1, bankedHours / allocatedHours) : 0;

  // trend: newest-first array → sign(newest − oldest of the recent window).
  const trend: Trend =
    papers >= 2 ? sign((scored[0]!.scorePct ?? 0) - (scored[papers - 1]!.scorePct ?? 0)) : null;

  const dataStrength: DataStrength = papers === 0 ? "thin" : papers >= 3 ? "solid" : "ok";

  // Honesty gate: no scored paper ⇒ no number.
  if (papers === 0 || performance == null) {
    return {
      subjectId, enough: false, readiness: null, performance: null, coverage, pace,
      trend: null, dataStrength: "thin", papers: 0, bankedHours, allocatedHours,
      confidentTopics, totalTopics,
    };
  }

  const readiness = 0.4 * performance + 0.35 * coverage + 0.25 * pace;
  return {
    subjectId, enough: true, readiness, performance, coverage, pace, trend, dataStrength,
    papers, bankedHours, allocatedHours, confidentTopics, totalTopics,
  };
}

/** Readiness for every configured subject, in config order. */
export function readinessForAll(
  state: ReflowState,
  plan: WeekPlan,
  weekDates: string[]
): SubjectReadiness[] {
  return state.config.subjects.map((s) =>
    subjectReadiness(state, s.id, plan.allocations, weekDates)
  );
}
