import type {
  AllocatorInput,
  AllocatorOutput,
  SubjectAllocation,
  SubjectSignals,
} from "./types";
import { computeSubjectWeight } from "./weighting";

/**
 * Derive per-subject weekly hours from signals:
 *   1. Pinned subjects get exactly their pinned hours.
 *   2. The remainder is split among the rest in proportion to each subject's
 *      weight = computeSubjectWeight(...) × llmWeight.
 *
 * The weighting JUDGMENT lives in weighting.ts; this function only does the
 * bookkeeping (pins, normalization, exact sum).
 */
export function allocate(input: AllocatorInput): AllocatorOutput {
  const { totalAvailableHours, subjects, config } = input;

  const pinned = subjects.filter((s) => s.pinnedHours != null);
  const unpinned = subjects.filter((s) => s.pinnedHours == null);

  const pinnedHoursTotal = pinned.reduce((t, s) => t + (s.pinnedHours ?? 0), 0);
  const remainder = Math.max(0, totalAvailableHours - pinnedHoursTotal);

  const weightOf = (s: SubjectSignals) =>
    computeSubjectWeight(s, config) * (s.llmWeight ?? 1);
  const weightSum = unpinned.reduce((t, s) => t + weightOf(s), 0);

  const allocations: SubjectAllocation[] = subjects.map((s): SubjectAllocation => {
    if (s.pinnedHours != null) {
      return {
        subjectId: s.subjectId,
        hours: s.pinnedHours,
        rationale: `Pinned to ${s.pinnedHours}h.`,
      };
    }
    const share =
      weightSum > 0 ? (weightOf(s) / weightSum) * remainder : remainder / unpinned.length;
    return {
      subjectId: s.subjectId,
      hours: share,
      rationale: `Weighted share of ${remainder}h remaining after pins.`,
    };
  });

  return { allocations };
}
