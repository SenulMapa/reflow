# Reflow: A-Level Study App — CLAUDE.md

**Project:** Personal single-user study app for A-Level exam prep. Repo: `SenulMapa/reflow` (public, main branch). User: adam@tryoneco.com.

## Overview

**The Moat:** A **Allocator + Placer** scheduling engine that derives weekly subject hours from signals (days-to-exam, topic confidence, past-paper performance, subject load) and reflows them into the calendar around fixed commitments. Engine is pure zero-I/O TypeScript, runs offline on-device AND server-side (for Siri). Auto-applies with one-tap undo.

**Current State:** Phases 0–4 complete & shipped. Phase 5 (library/glass) + Phase 6 (Siri) blocked on user/infrastructure. V2 "Orbit + AI Tutor" shipped. **v2.0.0 (2026-07-11): ground-up rebuild on Expo SDK 54 (RN 0.81.5, React 19.1.0) — downgraded from SDK 56 and stripped the native-module launch-crash class** (removed expo-updates/notifications/whisper.rn/audio/glass-effect/blur/image/supabase/secure-store/file+doc+image-picker/sharing/web-browser/datetimepicker/keyboard-controller/flash-list). Pure engine/state/lib preserved (128 tests). Lean Expo-Go-stable deps only. See memory `reflow-sdk54-rebuild-v2`.

## Tech Stack

- **Framework:** Expo SDK 54, React Native 0.81.5, React 19.1.0 (downgraded from SDK 56 in v2.0.0 rebuild to kill native-module launch crashes)
- **Routing:** expo-router (deep-link enabled)
- **State:** Zustand v5 + AsyncStorage (offline-first, sync deferred to Supabase)
- **Styling:** "Calm Nothing OS" system-adaptive tokens (monochrome, single signal-red #D71921, OLED-black dark / warm-grey light). Fonts: **IBM Plex Mono** (SemiBold headings, Regular body/labels) + **DotGothic16** (hero numerals only) — SIL-OFL substitutes for Nothing's license-locked Ndot/NType82. Shapes: 20px hairline cards ("round the corners, keep the ruler"), one full-`Pill` primary action per screen, red = only the current action. See `docs/superpowers/specs/2026-07-11-nothing-premium-polish.md`.
- **UI Components:** expo-haptics, react-native-reanimated 4.3.1, react-native-gesture-handler 2.31.1, safe-area-context, react-native-svg
- **LLM:** MiniMax-M3 (via swappable `generate()` client in `/llm` Edge Function proxy)
- **Backend:** Self-hosted Supabase (Ubuntu 24.04 box, 100.86.148.112:2222, SSH key ~/OpenClaw_key.pem)
- **CI/CD:** GitHub Actions macOS runners (build-ios.yml), EAS Update for JS-only OTA

## Architecture

### Data Layer
- **Pure Engine:** `src/engine/` — zero I/O, runs offline and server-side
  - `intervals.ts`: interval arithmetic, overlap-merge normalization
  - `types.ts`: core domain types (Interval, Exam, Subject, etc.)
  - `allocator.ts`: derives weekly hours via weighting (additive weakness + bounded exam boost)
  - `placer.ts`: slot-aligned placement, anchor-safe, consumes windows to prevent overlaps
  - `week.ts`: planWeek + reflow (add/remove diff for undo)
  - `sm2.ts`: SM-2 spaced-repetition scheduler (pure, 8 tests) — powers flashcards; due-count is an allocator signal
  - `forecast.ts`: recency-weighted grade forecast from scored past papers (pure, 6 tests) — honest "none/thin" until real signal
- **State Model:** `src/state/model.ts` — pure reducers (no I/O); types for StudentModel, FocusSession, Reflection, PastPaper, Correction, PomodoroConfig, Plant, Reward
- **Store:** `src/state/store.ts` — Zustand + AsyncStorage; persist v9 (state + deck + chat + pomodoro + garden + reflections)

### App Screens — IA: `Now · Plan · Practice · Progress` tabs (Fable IA; "More" retired)
Route filenames kept stable to avoid orphaning; tabs re-labelled. Tutor + Settings are omnipresent header glyphs on Now, not tabs.
- **Now** (`app/(tabs)/index.tsx`): 4 calm zones — hero (NowBlock, DotGothic16 time) · one coach line · Today strip · AmbientStrip (streak·garden·countdown → Progress). Hard rule: only next-action/today/ambient live here; everything else earns a tap or a contextual moment.
- **Plan** (`app/(tabs)/week.tsx`): schedule, allocation chips, tap-to-reflow, undo; links to Availability (fixed commitments).
- **Practice** (`app/(tabs)/practice.tsx`): AI quiz + Feynman grading; links to `/grade` (AI mark-scheme examiner) and `/corrections`.
- **Progress** (`app/(tabs)/progress.tsx`): Readiness + Garden + "Log paper" action; tap-throughs to Insights, Rewards, Flashcards, Textbooks.
- **Timer** (`app/timer.tsx`): giant DotGothic16 countdown hero, segmented progress, Pill start, editable Pomodoro.
- **Cards** (`app/cards.tsx`): SM-2 spaced-repetition review — due-count hero, reveal→grade (Again/Hard/Good/Easy), AI deck generation.
- **Grade** (`app/grade.tsx`): AI mark-scheme grading — point-by-point examiner marking, missed points → corrections.
- **Library/Reader** (`app/library.tsx`, `app/reader.tsx`): textbook index over KB pdf `Source`s; reader with working text notes + Pencil-ink toolbar gated behind a dev build (`src/lib/pdfCapability`).
- **Reflect / Tutor / Setup / Corrections / Metrics / Rewards / Availability**: as before, re-skinned to the calm-Nothing system.

### UI / Styling
- **Theme:** `src/theme/theme.ts` (system-adaptive, coerced `useColorScheme()` for RN 0.85 width)
- **Tokens:** `src/theme/tokens.ts` (colors, typography via PP Editorial New, spacing, radius, subject colors)
- **Components:** `src/ui/` — Orbit identity (OrbitRing, OrbitRow), deck (Ridge, CardDeck), primitives (PressableScale, FadeInView, Skeleton, haptics)

### Engine Integration
- `src/lib/buildWeek.ts`: subjects + timetable → engine input (IAL exams seeded in `src/data/ial-exams-2027.ts`)
- `src/lib/pomodoro.ts`: pure timer (focus/break phases, duration calc)
- `src/lib/parseBlock.ts`: NL block parser (deterministic: "dinner 6-8" → block; fallback MiniMax for messy)
- `src/lib/llm.ts`: generate() client (EXPO_PUBLIC_LLM_URL gate, timeout AbortController)
- `src/lib/blockEntry.ts`: local-first + MiniMax fallback (wired to quick-add)

### Server
- `server/llm/server.js`: Node proxy for MiniMax (tasks: chat, plan_deck)
- `server/llm/deploy.sh`: redeploy via scp + docker compose (production requires user `!` override)
- `supabase/functions/llm/index.ts`: swappable Edge Function (IAL examiner prompt)

## Key Conventions

### Naming & Files
- Reducers in model.ts are named `lowercase` (e.g., `addFocusSession`, `setDeck`, `addPlant`)
- Store methods wrap reducers via `apply()` helper
- Screens use expo-router deep-linking; navigate via `useRouter().push()` on plain Pressable (avoid Link + styled Pressable = web crash)
- Tests in `*.test.ts` colocated with source
- Persist schema bumped (v9 = state + deck + chat + pomodoro + garden + reflections)

### Web Quirks (Verified)
- `<Link asChild>` wrapping a **style-bearing** Pressable → style array forwards to `<a>` DOM node → `indexed property on CSSStyleDeclaration` THROW. **FIX:** navigate via router.push() or remove style from Pressable (move to inner View)
- Zustand v5 `import.meta.env` breaks Expo web → babel.config.js rewrites `import.meta` → `({})` inline
- react-native-web 0.21 + react-dom 19: style array on Pressable under Link throws. **Always visually verify web after adding Link/Pressable changes.**

### Mobile Polish
- `haptics.*` for feedback (success/light/selection) — device-only verification required
- Reanimated 4.3.1 for smooth animations (not worklets yet, Reanimated 4 supports shared values)
- expo-glass-effect queued for Phase 5 (SDK 56 native), not active in current build

### Testing & Verification
- **Local:** `npm test` (vitest, 82+ tests green), `tsc --noEmit` (typecheck), `npm run typecheck`
- **Bundle:** `npx expo export -p web` (proves full bundling, ~706 modules)
- **Screenshots:** bundled chromium + playwright-core, `dangerouslyDisableSandbox` for http.server, waitUntil domcontentloaded, both themes + iPad width
- **Device:** `npx expo start` → scan QR in Expo Go (offline works, all Expo-Go-compatible deps)
- **Linux limitation:** No iOS sim, no Chrome+sudo → screenshot verification only via web export

## Build & Deployment

### Commands
```bash
npm start                          # Expo dev server
npx expo start --web               # Web-only dev
npx expo export -p web             # Static web export (dist/)
npm test                           # Vitest suite
npm run typecheck                  # TypeScript check
eas update --channel production    # JS-only OTA (NEVER bump version for OTA)
bash server/llm/deploy.sh          # Redeploy MiniMax proxy (requires ! override)
```

### OTA & Builds
- **Runtime Version:** `appVersion` (1.0.0), policy `appVersion`
- **OTA Channel:** `production` (JS-only updates via EAS)
- **Native Builds:** `.github/workflows/build-ios.yml` (macOS-26 runner, unsigned IPA → SideStore)
- **SideStore Source:** `https://raw.githubusercontent.com/SenulMapa/reflow/main/source.json` (auto-generated by CI)
- **Bundle ID:** `com.senul.reflow`
- **EAS Project:** `@senulmapa/reflow` (id 5e3ec5c8-fdd2-4954-8677-8793e10e2f75)

### Environment
- **EXPO_PUBLIC_LLM_URL:** URL to MiniMax proxy (set in gitignored .env, inlines at build)
- **EXPO_PUBLIC_* vars:** Inlined at build time (safe for public keys)
- **Box SSH:** `ssh -i ~/OpenClaw_key.pem -p 2222 Senul@100.86.148.112` (username is capital S)
- **Box constraints:** 892MB RAM (~395 avail), Ubuntu 24.04, Caddy reverse proxy (sslip.io cert)

## Subjects & Exams

**Edexcel IAL (May/June 2027):**
- Mathematics WMA11/WMA12/WME01
- Physics WPH11/WPH12/WPH13
- Psychology WPS01/WPS02

**Cambridge (9618, 2027):**
- Computer Science (timetable TBD)

Seeded in `src/data/ial-exams-2027.ts`; `daysToExam` = nearest upcoming unit.

## Feature Roadmap (V2 "Orbit" Spec)

**SHIPPED (Phases 0–4 + V2):**
- Interleaving / anti-cramming (placer round-robin + 120m cap)
- Session missions (weakest topic + corrections)
- Completion tracking (tap=done/strike, long-press=skip, "N/M done" header)
- Weekly momentum + Level/XP bar
- Reward economy (coins, streaks, shop, ledger)
- AI tutor chat (Grok-style, learns from studentModel)
- Tutor-arranged card deck (fallback instant, tutor swap silent)
- Focus timer with growth glyph, editable Pomodoro, completion card
- Garden (plants grow with sessions, real state)
- Post-session reflect (text + voice pending dev-build)
- Corrections Booklet (per-topic confidence)
- Past-paper tracker + performance insights
- In-app knowledge base (PDF/YouTube/link manager)
- PP Editorial New typography, system-adaptive Orbit identity

**NEXT (V2 Sub-Projects SP2–SP7):**
- **SP2:** Kill mock data (coins 240/streak 3 currently seeded)
- **SP3:** Voice reflection loop (on-device whisper.rn → box fallback)
- **SP5:** NotebookLM-seeded dynamic Practice
- **SP6:** Garden focus timer (already built, polish pending)
- **SP4/SP7:** Tutor chat + deck planner (DONE)

**BLOCKED (Phase 5–6, infrastructure-gated):**
- **Phase 5:** Native glass (expo-glass-effect, SDK 56, requires macOS build)
- **Phase 6:** Siri App Intents (requires macOS build, AltStore IPA)
- **KB RAG (#7):** User must provide source PDFs; then ingest pipeline (chunk/embed/pgvector/retrieve)

## Known Blockers & Gotchas

1. **Box provisioning (Phase 0):** Supabase not yet running on box. User must SSH provision (consequential writes). Key at ~/OpenClaw_key.pem.
2. **MiniMax model change:** Switched from M2 → M3 (2026-07-08). Proxy deployed, verified live chat.
3. **Unsecured LLM endpoint:** `/llm` proxy lacks auth header — add shared-secret before public deployment.
4. **Web Link+Pressable crash:** Must use router.push() or unstyled Pressable. Always visually verify web after changes.
5. **Screenshot only on web:** Linux sandbox cannot run iOS sim or real Chrome; verify via `expo export -p web` + playwright-core.
6. **NEVER OTA with version bump:** Installed binary RTV must match EAS channel's runtimeVersion.
7. **No Playwright in sandbox:** Use bundled chromium + dangerouslyDisableSandbox for http.server, waitUntil domcontentloaded, not networkidle.

## User Intent & Notes

- **Build autonomously:** phases 1–4 + v2 (no waiting on user), verify visually before handing off.
- **SDK 56 upgrade complete:** User wanted UI/UX tested before the glass integration gate; app is now on SDK 56 (RN 0.85.3, React 19.2.3) per package.json.
- **OSS / self-hostable business model:** (n8n-style), not SaaS lock-in. GitHub Actions CI builds via public runners (iOS support).
- **Mobile polish:** Apply haptics, springs, animations in-context (not after-the-fact). Use mobile-app-premium-polish skill.
- **NEVER use hosted Artifacts:** Verify locally / in-app instead (user rule).

## Current Status (As of 2026-07-08 03:56)

- **Git:** Multiple commits daily, active development
- **Tests:** 82+ green (vitest), tsc clean, web export clean
- **Screens:** Home, Week, Timer, Reflect, Tutor, Setup, Corrections, Metrics all present and polished
- **Latest:** Security review of reflect/timer/garden changes; latest store v9 (added pomodoro + plant + reflection reducers)
- **Deployment:** EAS Update working, GitHub CI built first IPA, SideStore source live
- **Offline:** Full functionality offline (AsyncStorage, no network required until box ready)

## File Paths (Key Directories)

```
/home/senul/reflow/
├── app/                    # Expo Router screens
│   ├── index.tsx          # Home (tutor deck, orbits)
│   ├── week.tsx           # Classic week view
│   ├── timer.tsx          # Pomodoro timer
│   ├── reflect.tsx        # Post-session reflection
│   ├── tutor.tsx          # AI chat
│   ├── setup.tsx          # Config
│   ├── corrections.tsx    # Weakness loop
│   ├── metrics.tsx        # Insights
│   └── _layout.tsx        # Router shell
├── src/
│   ├── engine/            # Core scheduling logic (pure, zero-I/O)
│   ├── state/             # Model + store (Zustand)
│   ├── theme/             # Tokens, theme provider
│   ├── ui/                # Orbit/deck/polish components
│   ├── lib/               # Pomodoro, parseBlock, llm, buildWeek
│   └── data/              # IAL exams seed
├── server/llm/            # MiniMax proxy (Node)
├── supabase/functions/    # Edge Function (tsc excluded)
├── docs/                  # Specs, plans, screenshots
├── .github/workflows/     # build-ios.yml (CI)
├── assets/fonts/          # PP Editorial New OTF files
├── package.json           # Dependencies (Expo 56, React 19, Zustand 5)
├── app.json               # Expo config, bundleId, runtimeVersion
└── eas.json               # EAS build config
```

## References

- **Memory:** `/home/senul/.claude/projects/-home-senul/memory/project_reflow_study_app.md` (comprehensive history + box facts)
- **Spec:** `docs/superpowers/specs/2026-07-08-reflow-v2-tutor-dashboard-design.md`
- **Plan:** `docs/superpowers/plans/2026-07-08-sp1-orbit-identity.md` (V2 build workflow)
- **Transcript:** Latest session @ `/home/senul/.claude/projects/-home-senul-reflow/a58a2591-c1b6-463a-8cb0-45b76de1c977.jsonl` (2026-07-08 03:56)
- **Box:** `Senul@100.86.148.112:2222` (SSH -p 2222, key ~/OpenClaw_key.pem)
