/**
 * The auto signal loop — "studying IS the data entry." Observed performance
 * (a Feynman self-explanation grade) nudges the topic's confidence, which feeds
 * the allocator (hours shift) and the readiness coverage — so the student never
 * files paperwork; the act of practising updates the model. Pure + bounded.
 */

/**
 * Blend a topic's current confidence (1..10) toward a freshly observed score
 * (0..10) with an exponential-moving-average weight. Gentle by default so a
 * single result never overwrites the accumulated prior; clamped to 1..10.
 */
export function nudgeConfidence(current: number, towardScore10: number, weight = 0.4): number {
  const blended = current * (1 - weight) + towardScore10 * weight;
  return Math.max(1, Math.min(10, Math.round(blended)));
}
