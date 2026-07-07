import { describe, expect, test } from "vitest";
import { initialState, markSessionDone, redeemReward, touchStreak } from "./model";
import { EARN, levelForXp, levelProgress } from "./rewards";

const REF = "2027-04-25";

describe("reward economy", () => {
  test("levels rise with XP and progress is fractional", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(60)).toBe(2);
    const p = levelProgress(90);
    expect(p.level).toBe(2);
    expect(p.frac).toBeGreaterThan(0);
    expect(p.frac).toBeLessThan(1);
  });

  test("marking a session done awards coins + xp and is idempotent", () => {
    const s0 = initialState(REF);
    const s1 = markSessionDone(s0, "k1", "2027-04-25");
    expect(s1.progress.coins).toBe(s0.progress.coins + EARN.session.coins);
    expect(s1.progress.xp).toBe(s0.progress.xp + EARN.session.xp);
    expect(s1.sessionStatus.k1).toBe("done");
    // doing it again must NOT double-pay
    const s2 = markSessionDone(s1, "k1", "2027-04-25");
    expect(s2.progress.coins).toBe(s1.progress.coins);
  });

  test("streak increments on consecutive days, resets after a gap", () => {
    let s = initialState(REF);
    s = touchStreak(s, "2027-04-25");
    expect(s.progress.streakDays).toBe(1);
    s = touchStreak(s, "2027-04-26");
    expect(s.progress.streakDays).toBe(2);
    s = touchStreak(s, "2027-04-28"); // skipped the 27th
    expect(s.progress.streakDays).toBe(1);
  });

  test("redeeming a reward spends coins only when affordable", () => {
    const s0 = initialState(REF); // 240 coins, has a 300-cost "Film night"
    const tooDear = redeemReward(s0, "film", REF);
    expect(tooDear.progress.coins).toBe(s0.progress.coins); // unchanged
    const ok = redeemReward(s0, "game", REF); // 120
    expect(ok.progress.coins).toBe(s0.progress.coins - 120);
    expect(ok.progress.ledger[0]).toMatchObject({ kind: "spend", amount: 120 });
  });
});
