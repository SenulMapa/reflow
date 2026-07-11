/**
 * Grade / weak-spot forecast (Fable feature 1.6). Pure, zero-I/O. Projects a
 * subject's trajectory from its scored past papers using a RECENCY-weighted linear
 * regression — recent papers count more, because momentum matters near an exam.
 *
 * Honesty rule (matches the readiness ethos): with too little signal we return a
 * `dataStrength` of "none"/"thin" and DO NOT fabricate a projected grade. The UI
 * shows the honest gap, never an invented number.
 */

export interface ScoredPaper {
  scorePct: number; // 0..100
  date: string;     // ISO YYYY-MM-DD
}

export interface Forecast {
  /** Most-recent actual score, or null if none. */
  current: number | null;
  /** Projected score for the exam date (clamped 0..100), or null if too thin. */
  projected: number | null;
  /** Change in score per week implied by the trend (percentage points). */
  slopePerWeek: number | null;
  trend: "up" | "down" | "flat" | "unknown";
  dataStrength: "none" | "thin" | "ok";
}

const dayNumber = (iso: string): number =>
  Math.floor(new Date(iso + "T00:00:00Z").getTime() / 86_400_000);

/**
 * @param papers   scored papers (any order)
 * @param examISO  the exam date to project to (null → project to "now", the last paper)
 */
export function forecastSubject(papers: ScoredPaper[], examISO: string | null): Forecast {
  const pts = papers
    .filter((p) => typeof p.scorePct === "number")
    .map((p) => ({ x: dayNumber(p.date), y: p.scorePct }))
    .sort((a, b) => a.x - b.x);

  if (pts.length === 0) return { current: null, projected: null, slopePerWeek: null, trend: "unknown", dataStrength: "none" };

  const current = pts[pts.length - 1]!.y;

  if (pts.length === 1) {
    // One data point — report it, but no trend to project.
    return { current, projected: null, slopePerWeek: null, trend: "unknown", dataStrength: "thin" };
  }

  // Recency weights: newest paper weight 1, each older one decays by 0.7.
  const n = pts.length;
  const weights = pts.map((_, i) => Math.pow(0.7, n - 1 - i));

  const sw = weights.reduce((t, w) => t + w, 0);
  const meanX = pts.reduce((t, p, i) => t + p.x * weights[i]!, 0) / sw;
  const meanY = pts.reduce((t, p, i) => t + p.y * weights[i]!, 0) / sw;

  let num = 0, den = 0;
  pts.forEach((p, i) => {
    num += weights[i]! * (p.x - meanX) * (p.y - meanY);
    den += weights[i]! * (p.x - meanX) * (p.x - meanX);
  });
  const slopePerDay = den === 0 ? 0 : num / den;
  const slopePerWeek = Math.round(slopePerDay * 7 * 10) / 10;

  const lastX = pts[n - 1]!.x;
  const targetX = examISO ? dayNumber(examISO) : lastX;
  const rawProjected = current + slopePerDay * (targetX - lastX);
  const projected = Math.max(0, Math.min(100, Math.round(rawProjected)));

  const trend: Forecast["trend"] = slopePerWeek > 0.5 ? "up" : slopePerWeek < -0.5 ? "down" : "flat";
  const dataStrength: Forecast["dataStrength"] = pts.length >= 3 ? "ok" : "thin";

  return { current, projected, slopePerWeek, trend, dataStrength };
}
