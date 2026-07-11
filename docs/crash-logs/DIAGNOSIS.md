# Launch crash — confirmed root cause (v1.0.1 → v1.0.8)

**Symptom:** app paints one frame, then aborts (`Abort trap: 6` / SIGABRT, `bug_type 309`)
on the SideStore-sideloaded build. Persisted across eight versions of fixes.

**How it was finally found:** live device syslog over USB (`idevicesyslog -p Reflow`,
see `capture.sh`) — the `.ips` crash report does not contain the JS error string; the
live process log does.

## The actual error

```
Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.
```

Logged one line after RN's deprecation notice:

```
PushNotificationIOS has been extracted from react-native core and will be removed in a
future release.
```

## The chain

1. `_layout.tsx` (boot) → `configureNotifications()` **and** `index.tsx` (Home mount) →
   `syncSessionReminders()` both call `await import("expo-notifications")` — unguarded.
2. Evaluating `expo-notifications` enumerates the react-native core index, hitting the
   deprecated `PushNotificationIOS` getter.
3. On **RN 0.85** that module was removed from core, so its top-level
   `new NativeEventEmitter(<null native module>)` throws the Invariant Violation.
4. Unhandled → `-[RCTExceptionsManager reportFatal:]` → `RCTFatalException` →
   `__cxa_rethrow` → `wsp_ggml_uncaught_exception` (whisper.rn's `std::set_terminate`,
   the amplifier that masked the cause in every `.ips`) → `abort()`.

Faulting-thread frames (from the `.ips`, symbolicated):
`reportFatal → RCTGetFatalHandler → objc_exception_throw → __cxa_rethrow →
wsp_ggml_uncaught_exception → abort`. JS-thread stack (from syslog):
`invariant → NativeEventEmitter → get PushNotificationIOS → metroImportAll →
asyncRequire → syncSessionReminders → commitHookEffectListMount`.

**Not** fonts, expo-updates, glass, or jetsam — none of those frameworks appear in the
crash's loaded-image list. Those were all misreads of whisper's terminate frame.

## The fix (JS-only)

- `src/lib/notify.ts` — a `loadNotifications()` boundary that wraps the dynamic import in
  try/catch and returns `null` on failure; all three native functions degrade to no-ops.
  A reminder feature failing to load can no longer abort launch.
- `src/components/ErrorBoundary.tsx` — top-level boundary (the app had none) so future
  render throws show on-screen instead of white-screening + aborting.
- `src/lib/notify.test.ts` — regression test: import throws → functions return 0/false,
  never throw.

## Follow-ups (separate from the launch fix)

- Notifications still won't *function* until `expo-notifications` is made RN-0.85 safe
  (guarded means they no-op). Options: pin a compatible expo-notifications, add
  `@react-native-community/push-notification-ios`, or a metro shim for the getter.
- Build hygiene: the IPA ships with LLVM coverage instrumentation (`__LLVM_COV` segment;
  `deny file-write-create /default.profraw` in syslog). Strip coverage flags from the
  Release build in `build-ios.yml` / the Xcode config. Orthogonal to the crash.
- CI retains no dSYMs — add `-archivePath`/`-exportArchive` so future `.ips` symbolicate.
