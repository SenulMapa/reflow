# Reflow — Expo SDK 54 (React Native) study app

**Pinned to Expo SDK 54.** Read versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing native/Expo code. Do NOT bump to SDK 55/56 until the user says so (SDK 56 is planned later, for native Liquid Glass via `expo-glass-effect`).

## Architecture
- **Scheduling engine** — pure, zero-I/O TypeScript in `src/engine` (allocator + placer + week integration). Fully unit-tested with vitest. Runs on-device (offline) and will run server-side (for Siri) unchanged.
  - `intervals.ts` — free-window math. `allocator/` — derives per-subject weekly hours from signals (`weighting.ts` = the tunable heuristic). `placer/` — slot-aligned placement, anchor-safe, shortfall-honest. `week.ts` — `planWeek` + `reflow` (add/remove diff for undo).
- **Design system** — `src/theme` tokens (iOS-26, light/dark) + `src/components/Surface.tsx`. `Surface` is the ONLY elevated-surface primitive → the single swap point for Liquid Glass later.
- **App** — `expo-router` file-based routing in `app/`. `src/lib/buildWeek.ts` turns subjects + the real 2027 IAL timetable (`src/data/`) into engine input.

## Commands
- `npm test` — vitest (engine + data-path tests). Keep green; TDD new engine behavior.
- `npm run typecheck` — `tsc --noEmit`.
- `npx expo start --web` / `npx expo export -p web` — run/bundle the web target (used for verification on Linux; no iOS sim here).

Full design + phased plan: `~/.claude/plans/nuh-uh-not-claude-keen-quokka.md`.
