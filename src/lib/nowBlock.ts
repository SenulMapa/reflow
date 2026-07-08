/**
 * The Now-block state machine — the deterministic spine of the Home screen.
 *
 * Pure and clock-free BY DESIGN: the caller injects the wall-clock (`nowISO` +
 * `nowMinutes`), so this is fully unit-testable and the engine stays timezone-free.
 * It answers the one question Home must answer instantly: "what do I do right now?"
 */
import type { PlacedSession } from "../engine/placer/types";
import { sessionKeyOf } from "../state/model";

export type NowKind =
  | "missed"
  | "inProgress"
  | "startingNow"
  | "upcoming"
  | "done"
  | "rest"
  | "empty";

export interface NowState {
  kind: NowKind;
  /** The session the UI should act on (absent for done/rest/empty). */
  session?: PlacedSession;
  /** inProgress: minutes left until the session's end. */
  remainingMin?: number;
  /** upcoming/startingNow: minutes until the session starts. */
  startsInMin?: number;
  /** missed: how many of today's sessions have lapsed unfinished. */
  missedCount?: number;
}

/**
 * Pick the single most-relevant Now state, by priority:
 * Missed > InProgress > StartingNow > Upcoming > Done > Rest > Empty.
 */
export function selectNowState(
  allSessions: PlacedSession[],
  sessionStatus: Record<string, "done" | "skipped">,
  nowISO: string,
  nowMinutes: number,
  opts?: { startWindowMin?: number }
): NowState {
  const startWindow = opts?.startWindowMin ?? 5;
  const statusOf = (s: PlacedSession) => sessionStatus[sessionKeyOf(s)];

  // Today's sessions, skipped ones excluded entirely, earliest first.
  const today = allSessions
    .filter((s) => s.date === nowISO && statusOf(s) !== "skipped")
    .sort((a, b) => a.interval.start - b.interval.start);

  // MISSED — any not-done session whose interval has fully elapsed.
  const missed = today.filter((s) => s.interval.end <= nowMinutes && statusOf(s) !== "done");
  if (missed.length > 0) {
    return { kind: "missed", session: missed[0], missedCount: missed.length };
  }

  // INPROGRESS — now sits inside [start, end) and it isn't done.
  const active = today.find(
    (s) => s.interval.start <= nowMinutes && nowMinutes < s.interval.end && statusOf(s) !== "done"
  );
  if (active) {
    return { kind: "inProgress", session: active, remainingMin: active.interval.end - nowMinutes };
  }

  // STARTINGNOW — a not-done session about to start within the window.
  const starting = today.find(
    (s) =>
      statusOf(s) !== "done" &&
      s.interval.start > nowMinutes &&
      s.interval.start - nowMinutes <= startWindow
  );
  if (starting) {
    return { kind: "startingNow", session: starting, startsInMin: starting.interval.start - nowMinutes };
  }

  // UPCOMING — the next not-done session later today.
  const upcoming = today.find((s) => s.interval.start > nowMinutes && statusOf(s) !== "done");
  if (upcoming) {
    return { kind: "upcoming", session: upcoming, startsInMin: upcoming.interval.start - nowMinutes };
  }

  // DONE — there were sessions today and all are done.
  if (today.length > 0) return { kind: "done" };

  // REST vs EMPTY — nothing today, but the week may hold study elsewhere.
  if (allSessions.length > 0) return { kind: "rest" };
  return { kind: "empty" };
}
