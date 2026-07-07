# Reflow

Your A-Level study brain — with an AI tutor.

Reflow **derives** your weekly study hours per subject from live signals (days-to-exam,
per-topic confidence, past-paper performance) and **reflows** them around your life. Around
that scheduling engine sits an **AI tutor** that arranges your dashboard, answers questions
grounded in the IAL spec, and learns how you study from post-session reflections — plus a
**focus garden** and a **coin economy** that turns leisure into a guilt-free reward.

Built with Expo (SDK 56) + React Native. The scheduling engine is pure, zero-I/O TypeScript
(fully unit-tested). LLM = MiniMax, behind a swappable proxy.

## Install on your iPhone (SideStore / AltStore)

Add this source in SideStore → Sources → **＋**:

```
https://raw.githubusercontent.com/SenulMapa/reflow/main/source.json
```

Then install **Reflow** from that source. New JS-only updates arrive over-the-air (no reinstall);
you only reinstall when there's a new native build.

> `source.json` is generated automatically by CI on the first native build. If the link 404s,
> the first `Build iOS IPA` workflow hasn't finished yet.

## Development

```bash
npm install
npx expo start          # scan the QR with Expo Go (JS-only features)
npm test                # vitest — engine + state (pure TS)
npx tsc --noEmit        # type gate
npx expo export -p web  # web bundle (used for visual verification)
```

## Shipping — the OTA discipline (mirrors the Tani pipeline)

**Most changes ship over-the-air. Native builds are rare and expensive — don't waste them.**

- **JS-only change** (a screen, a fetch, styling, copy): ship it OTA, no build.
  ```bash
  eas update --channel production --message "what changed"
  ```
- **Native change** (deps that touch native, anything in `app.json` / `eas.json` / `ios/` /
  `android/` / `plugins/`): push to `main` — `.github/workflows/build-ios.yml` builds an
  unsigned IPA, publishes a GitHub Release, and updates `source.json`. It is **path-filtered**,
  so a JS-only push never triggers a build.

**Invariants that keep OTA working (do not break these):**

1. `app.json` → `updates.requestHeaders."expo-channel-name": "production"` must stay — without
   it the app requests updates with no channel and EAS serves nothing.
2. `runtimeVersion.policy = "appVersion"` — the runtime version *is* the version string.
3. **Never bump `version` in `app.json` for a JS-only OTA** — the installed binary would no
   longer match the OTA bundle and updates go dark. Bump `version` only alongside a new IPA.

## Project layout

```
app/                 expo-router screens (Home, Tutor, Timer, Reflect, Week, …)
src/engine/          Allocator + Placer scheduling engine (pure TS, tested)
src/state/           zustand store + pure reducers (model.ts)
src/ui/, components/ Orbit ring / deck / chat / markdown / polish primitives
src/theme/           PP Editorial New type scale + Orbit palette (light/dark)
server/llm/          MiniMax proxy (chat, plan_deck, quiz, …) — deployed on the box
docs/superpowers/    design spec + implementation plan
```
