/**
 * The reward economy — the "delay, don't deny" loop made literal: you EARN gold
 * coins by studying and SPEND them on real-life leisure you define (gaming,
 * films). Plus XP/levels for long-term momentum. Pure, testable helpers.
 */

export interface RewardItem {
  id: string;
  label: string;
  cost: number;
  icon?: string;
}

export interface LedgerEntry {
  id: string;
  kind: "earn" | "spend";
  amount: number;
  reason: string;
  date: string;
}

export interface Progress {
  coins: number;
  xp: number;
  streakDays: number;
  /** ISO date of the most recent day that counted toward the streak. */
  lastStudyDate: string | null;
  rewards: RewardItem[];
  ledger: LedgerEntry[];
}

/** Coins + XP granted per action. Sessions pay best — they're the real work. */
export const EARN = {
  session: { coins: 20, xp: 15 },
  focus: { coins: 10, xp: 10 },
  correction: { coins: 5, xp: 6 },
  practice: { coins: 8, xp: 8 },
} as const;

/** Level from XP (gentle curve — each level costs a bit more). */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 60;
}

export function levelProgress(xp: number): {
  level: number;
  into: number;
  span: number;
  frac: number;
} {
  const level = levelForXp(xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - cur;
  return { level, into: xp - cur, span, frac: span > 0 ? (xp - cur) / span : 0 };
}
