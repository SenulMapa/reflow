/**
 * Local session reminders — "a scheduler that never pings you is a diary."
 * Schedules a local notification a few minutes before each upcoming study block,
 * straight from the plan. Fully offline (no push server).
 *
 * The pure core (`dueReminders`) is unit-tested; the native IO lazy-imports
 * expo-notifications/react-native INSIDE the async functions so tests and the web
 * bundle never load native modules that don't exist there.
 */
import type { PlacedSession } from "../engine/placer/types";
import { sessionKeyOf } from "../state/model";
import { fmtTime } from "./format";

export interface Reminder {
  key: string;
  fireAtMs: number;
  title: string;
  body: string;
}

/** Which sessions still have a future reminder time, earliest-first (pure). */
export function dueReminders(
  sessions: PlacedSession[],
  nameOf: (subjectId: string) => string,
  nowMs: number,
  opts?: { leadMin?: number; horizonDays?: number }
): Reminder[] {
  const lead = opts?.leadMin ?? 10;
  const horizonMs = opts?.horizonDays ? nowMs + opts.horizonDays * 86_400_000 : Infinity;
  return sessions
    .map((s) => ({
      key: sessionKeyOf(s),
      fireAtMs: Date.parse(`${s.date}T00:00:00`) + (s.interval.start - lead) * 60_000,
      title: `${nameOf(s.subjectId)} in ${lead} min`,
      body: `${fmtTime(s.interval.start)}–${fmtTime(s.interval.end)} · your next focus block`,
    }))
    .filter((r) => r.fireAtMs > nowMs && r.fireAtMs <= horizonMs)
    .sort((a, b) => a.fireAtMs - b.fireAtMs);
}

// ── Native IO (no-op on web / in tests) ─────────────────────────────────────

async function isWeb(): Promise<boolean> {
  try {
    const { Platform } = await import("react-native");
    return Platform.OS === "web";
  } catch {
    return true;
  }
}

/**
 * Crash-safe handle to expo-notifications. Returns null (and NEVER throws) when the
 * native module can't be evaluated — most importantly on RN 0.85, where the deprecated
 * `PushNotificationIOS` was removed from react-native core, so loading expo-notifications
 * can throw `Invariant Violation: new NativeEventEmitter() requires a non-null argument`.
 * That throw, unguarded, was the confirmed launch-crash (RCTFatal → whisper terminate →
 * SIGABRT). A reminder feature failing to load must never abort app launch, so every
 * caller degrades to a no-op instead. Mirrors the web guard in `isWeb`.
 */
type NotificationsModule = typeof import("expo-notifications");
async function loadNotifications(): Promise<NotificationsModule | null> {
  if (await isWeb()) return null;
  try {
    return await import("expo-notifications");
  } catch (e) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[notify] expo-notifications unavailable; reminders disabled:", e);
    }
    return null;
  }
}

let configured = false;
/** Show reminders as banners even with the app foregrounded. Call once at boot. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  configured = true;
}

/**
 * Report notification permission. With `prompt` (default), asks the OS if not yet
 * granted; without it, only reads the current status (never shows a dialog) — so
 * background re-syncs never nag the student.
 */
export async function ensureNotificationPermission(prompt = true): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!prompt) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Reconcile scheduled reminders to the current plan: cancel everything, then
 * schedule the upcoming week's session-start pings. Safe to call on every plan
 * change. Returns how many were scheduled (0 on web / no permission).
 */
export async function syncSessionReminders(
  sessions: PlacedSession[],
  nameOf: (subjectId: string) => string,
  opts?: { leadMin?: number; prompt?: boolean }
): Promise<number> {
  const Notifications = await loadNotifications();
  if (!Notifications) return 0;
  // Home re-syncs with prompt:false (silent); the Setup toggle passes prompt:true.
  if (!(await ensureNotificationPermission(opts?.prompt ?? false))) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const reminders = dueReminders(sessions, nameOf, Date.now(), { leadMin: opts?.leadMin ?? 10, horizonDays: 7 });
  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.fireAtMs) },
    });
  }
  return reminders.length;
}
