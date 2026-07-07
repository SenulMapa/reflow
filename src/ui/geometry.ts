/** Pure geometry for the Orbit ring and the momentum ridge. No I/O, no clocks. */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Stroke-dasharray metrics for a coverage ring. `undefined` ⇒ empty ring. */
export function ringMetrics(coverage: number | undefined, radius: number) {
  const circumference = 2 * Math.PI * radius;
  const frac = coverage == null ? 0 : clamp(coverage, 0, 1);
  return { circumference, dashOffset: circumference * (1 - frac) };
}

/** Angle (deg, 0°=east, -90°=north) for the exam marker; nearer exam ⇒ further round. */
export function examMarkerAngleDeg(daysToExam: number | null, windowDays = 365): number | null {
  if (daysToExam == null) return null;
  const frac = 1 - clamp(daysToExam / windowDays, 0, 1);
  return -90 + frac * 360;
}

export function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Smooth ridge line + closed area path from a series of values. */
export function ridgePath(values: number[], width: number, height: number, pad = 4) {
  const n = values.length;
  const max = Math.max(...values, 1);
  const span = n > 1 ? (width - 2 * pad) / (n - 1) : 0;
  const xs = (i: number) => pad + i * span;
  const ys = (v: number) => height - pad - (v / max) * (height - 2 * pad);
  const points = values.map((v, i) => ({ x: xs(i), y: ys(v) }));

  if (n === 1) {
    const p = points[0]!;
    const line = `M ${p.x} ${p.y}`;
    return { line, area: `${line} Z`, points };
  }

  let line = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < n; i++) {
    const a = points[i - 1]!, b = points[i]!, mx = (a.x + b.x) / 2;
    line += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  }
  const area = `${line} L ${points[n - 1]!.x} ${height} L ${points[0]!.x} ${height} Z`;
  return { line, area, points };
}
