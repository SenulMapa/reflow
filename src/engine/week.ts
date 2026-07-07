import type { AllocatorConfig, SubjectAllocation, SubjectSignals } from "./allocator/types";
import type { Interval } from "./types";
import type { PlacedSession } from "./placer/types";
import { allocate } from "./allocator/allocator";
import { freeWindows } from "./intervals";
import { place } from "./placer/placer";

/**
 * A day's study CANVAS: `availability` = when study could happen, minus recurring
 * `commitments` and one-off `blocks`. The weekly GOAL (WeekInput.weeklyGoalHours)
 * is placed into this canvas — the goal is stable, blocks only reshape the canvas.
 */
export interface DayTemplate {
  date: string;
  availability: Interval[];
  commitments: Interval[];
  blocks: Interval[];
}

export interface WeekInput {
  days: DayTemplate[];
  subjects: SubjectSignals[];
  config: AllocatorConfig;
  /** Total study hours to distribute this week (the goal — usually < canvas). */
  weeklyGoalHours: number;
  slotMinutes: number;
}

export interface WeekPlan {
  allocations: SubjectAllocation[];
  sessions: PlacedSession[];
  unplacedHours: Record<string, number>;
}

export interface WeekDiff {
  added: PlacedSession[];
  removed: PlacedSession[];
}

/**
 * Plan a whole week: distribute the weekly goal across subjects (Allocator),
 * then place those hours into the canvas (availability − commitments − blocks).
 * The goal is independent of blocks, so blocks only reshape where hours land.
 */
export function planWeek(input: WeekInput): WeekPlan {
  const { allocations } = allocate({
    totalAvailableHours: input.weeklyGoalHours,
    subjects: input.subjects,
    config: input.config,
  });

  const canvas = input.days.map((d) => ({
    date: d.date,
    free: freeWindows(d.availability, [...d.commitments, ...d.blocks]),
  }));

  const { sessions, unplacedHours } = place({
    days: canvas,
    demands: allocations.map((a) => ({ subjectId: a.subjectId, hours: a.hours })),
    slotMinutes: input.slotMinutes,
  });

  return { allocations, sessions, unplacedHours };
}

/**
 * Recompute the week after the canvas changes (e.g. a new block) and return the
 * add/remove diff vs the previous plan — the diff drives the undo notification.
 */
export function reflow(
  previous: WeekPlan,
  input: WeekInput
): { plan: WeekPlan; diff: WeekDiff } {
  const plan = planWeek(input);
  return { plan, diff: diffPlans(previous.sessions, plan.sessions) };
}

const sessionKey = (s: PlacedSession) =>
  `${s.date}|${s.subjectId}|${s.interval.start}|${s.interval.end}`;

function diffPlans(prev: PlacedSession[], next: PlacedSession[]): WeekDiff {
  const prevKeys = new Set(prev.map(sessionKey));
  const nextKeys = new Set(next.map(sessionKey));
  return {
    added: next.filter((s) => !prevKeys.has(sessionKey(s))),
    removed: prev.filter((s) => !nextKeys.has(sessionKey(s))),
  };
}
