/**
 * Core engine types. Time-of-day is modeled as integer minutes from midnight
 * ([start, end) half-open intervals) so the whole engine is pure integer math:
 * deterministic, timezone-free, trivially testable. Dates live at the app edges.
 */

/** A half-open interval [start, end) in minutes from midnight (0..1440). */
export interface Interval {
  start: number;
  end: number;
}
