import type { AllocatorConfig, SubjectSignals } from "./types";

/** Max multiplier a subject reaches as its exam lands (weight ramps 1× → this). */
const MAX_EXAM_BOOST = 3;
/** Weight-points added by a total past-paper failure (performanceScore 0). */
const PERFORMANCE_WEIGHT = 5;

/**
 * Compute a RAW, unnormalized weight (> 0) for how much study time a subject
 * deserves this week. See the design notes below the signature for the "why".
 *
 * Signals (see SubjectSignals):
 *   - daysToExam:       null = no exam; small = imminent; ≤0 = today/past.
 *   - avgConfidence:    1..10, LOWER = weaker = needs more time.
 *   - performanceScore: 0..1, LOWER = doing worse = needs more time (null early).
 *   - config.examWindowDays: when a subject is "in exam crunch".
 *
 * NOTE: llmWeight is applied by the Allocator AFTER this function, so ignore it
 * here and focus purely on the signal-driven judgment.
 *
 * DESIGN (additive base + bounded exam multiplier — the "steady everywhere,
 * crunch when it counts" philosophy, right for many parallel A-Level subjects):
 *   base        = weakness (always ≥1, so no subject ever rots) + performance penalty
 *   multiplier  = 1 outside the exam window / no exam / exam passed;
 *                 ramps up to MAX_EXAM_BOOST× as the date nears (bounded, so an
 *                 exam subject can't starve the others).
 */
export function computeSubjectWeight(
  signals: SubjectSignals,
  config: AllocatorConfig
): number {
  const { avgConfidence, daysToExam, performanceScore } = signals;

  const weakness = 11 - clamp(avgConfidence, 1, 10); // 1..10
  const performancePenalty =
    performanceScore == null ? 0 : (1 - clamp(performanceScore, 0, 1)) * PERFORMANCE_WEIGHT;
  const base = weakness + performancePenalty;

  // Clamp exam-today/past to 0 days so urgency PEAKS at the exam (max boost)
  // instead of collapsing. Upstream should pass null once an exam has passed.
  const proximityDays = daysToExam == null ? null : Math.max(0, daysToExam);
  const inWindow = proximityDays != null && proximityDays < config.examWindowDays;
  const examMultiplier = inWindow
    ? 1 + ((config.examWindowDays - proximityDays!) / config.examWindowDays) * (MAX_EXAM_BOOST - 1)
    : 1;

  return base * examMultiplier;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
