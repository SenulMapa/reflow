/**
 * SM-2 spaced-repetition engine (SuperMemo 2, Wozniak 1990). Pure and zero-I/O
 * like the rest of `src/engine` — the caller passes the review date in, so the
 * function is fully deterministic and unit-testable (no `Date.now`).
 *
 * A recall `quality` is graded 0–5:
 *   5 perfect · 4 correct after hesitation · 3 correct but hard ·
 *   2 wrong but familiar · 1 wrong · 0 blackout.
 * q ≥ 3 is a pass; q < 3 lapses the card back to the start of the ladder.
 */

export interface Sm2State {
  /** Consecutive successful reviews (the SM-2 `n`). */
  repetitions: number;
  /** Ease factor — how fast the interval grows. Floor 1.3, start 2.5. */
  easeFactor: number;
  /** Current interval in days. */
  interval: number;
  /** ISO date (YYYY-MM-DD) the card next falls due. */
  dueAt: string;
  /** ISO date of the most recent review, or null if never reviewed. */
  lastReviewedAt: string | null;
}

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;

/** A brand-new card, due immediately on `todayISO`. */
export function newCardState(todayISO: string): Sm2State {
  return { repetitions: 0, easeFactor: DEFAULT_EASE, interval: 0, dueAt: todayISO, lastReviewedAt: null };
}

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
};

/** Clamp a recall grade into the valid 0–5 range (defensive). */
export const clampQuality = (q: number): number => Math.max(0, Math.min(5, Math.round(q)));

/**
 * Apply one review. Returns the next SM-2 state; never mutates the input.
 * `reviewISO` is the date the review happened (drives the next `dueAt`).
 */
export function review(prev: Sm2State, quality: number, reviewISO: string): Sm2State {
  const q = clampQuality(quality);

  // Ease factor is always re-derived (SM-2 formula), floored at 1.3.
  const easeFactor = Math.max(MIN_EASE, prev.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  let repetitions: number;
  let interval: number;

  if (q < 3) {
    // Lapse: back to the bottom of the ladder, review again tomorrow.
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = prev.repetitions + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(prev.interval * easeFactor);
    interval = Math.max(1, interval);
  }

  return {
    repetitions,
    easeFactor: Math.round(easeFactor * 1000) / 1000,
    interval,
    dueAt: addDays(reviewISO, interval),
    lastReviewedAt: reviewISO,
  };
}

/** Is the card due for review on (or before) `todayISO`? */
export const isDue = (s: Sm2State, todayISO: string): boolean => s.dueAt <= todayISO;

/**
 * A "leech" is a card that keeps lapsing — its ease has bottomed out. Surfacing
 * these to the corrections/weakness loop is Fable feature 3.1.
 */
export const isLeech = (s: Sm2State): boolean => s.easeFactor <= MIN_EASE + 0.01 && s.repetitions === 0 && s.lastReviewedAt !== null;
