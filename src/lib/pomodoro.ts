/**
 * Pure pomodoro/focus-timer logic. The screen supplies elapsed wall-clock ms;
 * everything here is a pure function of (config, phase, elapsed) so it's fully
 * testable and deterministic. Completed focus sessions become tracked metrics
 * that feed the app's insights.
 */

export type Phase = "focus" | "break";

export interface PomodoroConfig {
  focusMin: number;
  breakMin: number;
}

export const DEFAULT_POMODORO: PomodoroConfig = { focusMin: 25, breakMin: 5 };

export function phaseDurationMs(config: PomodoroConfig, phase: Phase): number {
  return (phase === "focus" ? config.focusMin : config.breakMin) * 60_000;
}

export function remainingMs(config: PomodoroConfig, phase: Phase, elapsedMs: number): number {
  return Math.max(0, phaseDurationMs(config, phase) - elapsedMs);
}

export function isComplete(config: PomodoroConfig, phase: Phase, elapsedMs: number): boolean {
  return elapsedMs >= phaseDurationMs(config, phase);
}

export function nextPhase(phase: Phase): Phase {
  return phase === "focus" ? "break" : "focus";
}

/** Milliseconds → "MM:SS" countdown. */
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
