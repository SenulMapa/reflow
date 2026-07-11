import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { dueReminders } from "./notify";
import type { PlacedSession } from "../engine/placer/types";

const S = (subjectId: string, start: number, end: number, date: string): PlacedSession => ({
  date, subjectId, interval: { start, end },
});
const nameOf = (id: string) => ({ math: "Mathematics", physics: "Physics" }[id] ?? id);
const at = (date: string, min: number) => Date.parse(`${date}T00:00:00`) + min * 60000;

describe("dueReminders", () => {
  test("schedules a reminder `lead` minutes before a future session start", () => {
    const s = S("physics", 18 * 60, 19 * 60, "2027-05-01"); // 18:00
    const now = at("2027-05-01", 12 * 60); // noon
    const [r] = dueReminders([s], nameOf, now, { leadMin: 10 });
    expect(r).toBeTruthy();
    expect(r!.fireAtMs).toBe(at("2027-05-01", 18 * 60 - 10)); // 17:50
    expect(r!.title).toContain("Physics");
  });

  test("excludes sessions whose reminder time has already passed", () => {
    const s = S("math", 9 * 60, 10 * 60, "2027-05-01");
    const now = at("2027-05-01", 12 * 60); // noon, past the 8:50 reminder
    expect(dueReminders([s], nameOf, now, { leadMin: 10 })).toHaveLength(0);
  });

  test("respects a horizon and sorts earliest-first", () => {
    const a = S("math", 10 * 60, 11 * 60, "2027-05-02");
    const b = S("physics", 9 * 60, 10 * 60, "2027-05-01");
    const now = at("2027-05-01", 6 * 60);
    const out = dueReminders([a, b], nameOf, now, { leadMin: 5 });
    expect(out.map((r) => r.title)).toEqual([expect.stringContaining("Physics"), expect.stringContaining("Mathematics")]);
  });
});

// Regression: the launch crash was `import("expo-notifications")` throwing on RN 0.85
// (removed PushNotificationIOS → `new NativeEventEmitter(null)` Invariant Violation),
// unguarded, aborting the app. The native IO must degrade to a no-op, never throw.
describe("native reminder IO is crash-safe when expo-notifications can't load", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.doUnmock("expo-notifications"); vi.doUnmock("react-native"); });

  // Force native (non-web) so the guarded native path runs, and make the module blow up
  // on load exactly as it did on device.
  const loadNotifyWithFailingModule = async () => {
    vi.doMock("react-native", () => ({ Platform: { OS: "ios" } }));
    vi.doMock("expo-notifications", () => {
      throw new Error("Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.");
    });
    return import("./notify");
  };

  test("syncSessionReminders returns 0 instead of throwing (the launch-crash path)", async () => {
    const { syncSessionReminders } = await loadNotifyWithFailingModule();
    await expect(syncSessionReminders([], (id) => id, { prompt: false })).resolves.toBe(0);
  });

  test("configureNotifications resolves without throwing", async () => {
    const { configureNotifications } = await loadNotifyWithFailingModule();
    await expect(configureNotifications()).resolves.toBeUndefined();
  });

  test("ensureNotificationPermission returns false without throwing", async () => {
    const { ensureNotificationPermission } = await loadNotifyWithFailingModule();
    await expect(ensureNotificationPermission(false)).resolves.toBe(false);
  });
});
