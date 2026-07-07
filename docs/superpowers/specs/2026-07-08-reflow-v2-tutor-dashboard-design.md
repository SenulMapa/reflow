# Reflow v2 — The Tutor-Driven Study App (Design Spec)

Date: 2026-07-08 · Supersedes the "Exam Almanac" redesign for identity & home. Engine, LLM proxy, and infra are unchanged and reused.

## Why v2

The v1 app worked but felt "empty, tasteless, lifeless" and "more like a gaming thing than my all-in-one dashboard to acing my A-Levels." The student's own diagnosis names two core features that must define the app:

1. **The Reflow engine** — derives weekly hours per subject and reflows them around life. (Already built, kept.)
2. **The AI tutor** — an in-app MiniMax tutor that *knows the student like a real teacher*, and that the whole app is built around: it reads every data point, decides what the student should see, and arranges the dashboard per student.

Everything else (mock data, blank Practice, a dumb timer) is a symptom of those two not being fully realised. v2 fixes that.

## Product thesis

**You talk; the tutor learns; the app rearranges.**
After each study session you leave a spoken reflection. On-device ASR transcribes it, MiniMax distills it into structured signal (coverage, confidence, mistakes, what's next). That running stream is the tutor's model of you. From it, the tutor (a) writes the top-of-home "coach's note", (b) arranges the dashboard deck, and (c) feeds fresh signals into the deterministic engine, which reflows the week. The engine still owns all schedule math so the app can never render an invalid plan or a broken screen.

Two loops, closed:
- **Reflection loop:** study → speak → ASR → MiniMax → structured updates → coverage rings + corrections + "do next".
- **Planning loop:** updated signals → Allocator/Placer → reflowed week → tomorrow's deck.

## Non-negotiables carried from before

- Expo SDK 54 (no bump until user green-lights SDK 56 for native glass/Siri). Offline-first. MiniMax only, behind `generate()`. Self-hosted infra on the box. Secrets stay server-side / gitignored. Tests stay green; engine stays pure TS + TDD.

---

## 1. Visual identity — "Orbit"

A system-adaptive identity synthesised from three references the student chose (Gradient UI, Weather App, Insectopia):

- **Light = warm editorial** (Insectopia): kraft/cream paper, burnt-orange accent, calm and confident.
- **Dark = glass at night** (Gradient UI): violet-biased near-black, violet + amber glow, luminous data-viz.
- **Bones & restraint = Weather App**: huge confident numbers, soft-rounded cards, one accent against near-monochrome, and its signature ridge line-graph.

### Signature: the subject orbit
A subject is a luminous ring. **Fill = % covered · marker on the ring = where its exam sits in the year · centre = the countdown (days).** It is the Insectopia sun-circle, the Gradient-UI donut, and the Weather-app restraint fused into one repeatable object — the thing the app is remembered by. The nearest exam's orbit gets the accent halo ("lead").

### Tokens (both themes, via CSS-var-style theme object)
```
Light:  paper #EFE7D6 · raise #F7F1E4 · line #E0D4BC · ink #26221C · dim #8C8069
        accent #D9541E (burnt orange) · accentSoft #F4DCC8
Dark:   bg #141219 · raise #211E2B · line #2C2838 · ink #E9E5F2 · dim #8A839C
        accent #8B6FFF (violet) · amber #E7A339 · accentSoft #26203F
Subjects (both): Maths #5B6CFF · Physics #2E9E8F · Psychology #C65B7C
Semantic (both, separate from accent): success #3F9E6A · warning #E7A339 · danger #C7503C
```
### Type
SF Pro (native iOS, matches the Weather ref): heavy tight display for orbit numbers & greetings; regular text; uppercase tracked eyebrows. A characterful display face may be introduced at ship if it beats SF in-context, but SF is the baseline (zero webfont risk, authentically iOS). Fraunces serif from v1 is retired from the core UI.

### Motion
Deliberate, minimal: garden sprout sways while a session runs; ring fills animate on load; reflect-mic pulse while recording. All respect `prefers-reduced-motion`.

---

## 2. The tutor-driven dashboard (card deck)

The home screen is a **tutor-ordered stack of cards drawn from a fixed catalog the app knows how to render** (the "arranges a known deck" model the student approved — not fully-generative UI). This keeps it alive and per-student while staying fast, offline-capable, and impossible to break.

### Card catalog (v2)
`coach_note` (tutor's written message + rationale) · `orbits` (subject rings row) · `do_next` (single best next action → focus) · `momentum_ridge` (focus minutes this week) · `garden_peek` · `reflect_cta` · `past_paper_nudge` · `correction_review` · `weakness_spotlight` · `exam_taper` (near an exam).

### DeckPlan (what the tutor returns)
```ts
type DeckCard = { type: CardType; props?: Record<string, unknown>; reason?: string };
type DeckPlan = { cards: DeckCard[]; coachNote?: { body: string; why?: string }; generatedAt: string };
```
- The tutor picks **which** cards, their **order**, and the **copy** inside them — from the catalog only. Unknown or malformed card types are dropped; the app always has a deterministic **fallback deck** so a bad/absent LLM response never yields a blank screen.
- **Cheap & offline:** the deck is cached and only re-planned occasionally — on app open if stale (>~12h) or after a material event (a reflection, a reflow, an exam crossing). Never per-open. Between re-plans the cached deck renders instantly with live data bound into each card.
- The engine still computes all numbers; the tutor only decides emphasis and words.

### New engine/LLM task
`generate("plan_deck", { studentModel })` → `DeckPlan`. Validated against the catalog; falls back on any parse/timeout/auth failure.

---

## 3. The voice reflection loop

The heart of "the tutor knows you." Replaces manual coverage-tapping.

### Flow
1. **Record** — after a session (or anytime via `reflect_cta`), the student taps the mic and rambles.
2. **Transcribe** — on-device ASR, tiered so the same loop works everywhere:
   - **Dev/AltStore build (primary): `whisper.rn`** — a bundled `ggml-tiny.en`/`base.en` model running via whisper.cpp, **Core ML on iOS** (Neural Engine/Metal), fully offline. Its `RealtimeTranscriber` + VAD lets the reflect screen stream words in live as the student talks. Same Whisper family as the box. Bundled as a `require()` asset (metro configured for `.bin`). Alternative: Apple Speech via `expo-speech-recognition` (`requiresOnDeviceRecognition:true`) — no model to bundle, but less control and no bundled-model guarantee, so `whisper.rn` leads.
   - **Expo Go / fallback:** record audio (`expo-audio`) → POST to the box's faster-whisper endpoint (already running) → transcript. Same downstream.
   - **Last resort:** type it. The loop is identical from step 3.
3. **Distill** — `generate("distill_reflection", { transcript, subjectId, sessionId })` → structured:
   ```ts
   type Reflection = {
     summary: string;                 // cleaned prose, tutor's voice
     covered: { topic: string; delta: "started"|"progressed"|"confident" }[];
     confidenceShifts: { topic: string; to: number }[];  // 1..10
     mistakes: { topic: string; note: string }[];         // → auto-filed corrections
     nextUp?: string;                 // suggested next focus
     raw: string;                     // original transcript, kept
   };
   ```
4. **Apply** — reducers update per-topic coverage/confidence, append corrections, and set the tutor's `nextUp`. This bumps the DeckPlan as stale and feeds the Allocator's weakness signal.

### Coverage math (honest, no mock)
`% covered` for a subject = confident-share of its known topics (topics come from the NotebookLM seed, §4). Before any topics/reflections exist, orbits show **countdown only** (no fake fill) rather than a fabricated percentage.

---

## 4. NotebookLM seeding → dynamic Practice

Kills the "blank quiz-me / explain PO1" screen. The app never uploads whole textbooks (token cost); it bootstraps the tutor's knowledge from NotebookLM output the student pastes once.

### Seeding flow
1. **Copy prompt** — per subject, the app gives a ready-made prompt to paste into NotebookLM ("list this course's structure: units → lessons → topics; for each topic, key definitions/formulas/required knowledge…").
2. **Paste back** — the student pastes NotebookLM's output into the app.
3. **Structure** — `generate("seed_knowledge", { subjectId, pastedText })` → a `KnowledgeBase`:
   ```ts
   type Topic = { id: string; label: string; unit?: string; lesson?: string; keyPoints: string[] };
   type KnowledgeBase = { subjectId: string; distilled: string; topics: Topic[]; updatedAt: string };
   ```
   `distilled` is a compact per-subject brief (a few hundred tokens) injected into future practice/tutor calls — so MiniMax reasons from the student's real syllabus without re-sending the textbook.
4. **Edit anytime** — the student adds more pasted input later, or just tells the tutor in chat ("we started chapter 6") and it updates the KB dynamically.

### Practice becomes dynamic
Quiz/Feynman are generated against **real topics** from the KB, not hardcoded "PO1": "Explain *[actual topic label]* in your own words," quizzes cite the seeded key points and IAL mark-scheme framing. Topic pickers list the seeded `unit → lesson → topic`, never placeholder codes.

---

## 5. Garden focus timer

Replaces the dumb Pomodoro. Merges Forest-style grow-a-thing with the coin economy, in the nature/Insectopia soul.

- **Custom durations + presets** (25/50/custom); deep-work and pomodoro modes.
- **Grow:** starting a focus session plants a sprout that grows as minutes accrue; completing it adds a plant to the **garden** (a persistent grid the student fills over weeks). **Bail early → it wilts** (a real "don't abandon this" pull).
- **Earn:** completed sessions pay 🪙coins + XP (existing economy) and prompt the **voice reflection**.
- **Track more:** `focus_sessions` capture duration, interruptions, mode, subject/topic, completion → feed momentum ridge + Allocator.
- Coins still spend in **Rewards** (game/movie time — the "delay, don't deny" economy already built).

---

## 6. AI tutor chat

The in-app agent the student can just talk to. MiniMax, grounded in the student's `studentModel` (subjects, KBs `distilled`, recent reflections, corrections, plan) + IAL examiner system prompt.

- **Answer** subject questions (a quick reader on the phone when NotebookLM is overkill or rate-limited).
- **Act** on the app via a small tool surface the chat can call: adjust the schedule (propose a reflow), change what's next, update coverage, add a correction, tweak the KB. Actions route through the deterministic engine/reducers (never raw mutation), so the tutor "controls the app" safely.
- Reachable from the `Tutor` tab and from any coach-note ("tap to see why / ask about this").

---

## 7. Kill the mock data

Audit and remove every fabricated number (e.g. "23.5h this week", seeded 240 coins/320 XP/3-day streak, placeholder rewards presented as real history). Keep only real, student-owned truth: exam dates, subjects, the derived plan, and whatever the student has actually done/said. Empty states become **invitations** ("Nothing logged yet — reflect after your first session"), never fake fill. Onboarding that captures this properly is a **production** concern, explicitly deferred (still in UI-testing).

---

## Architecture & data model (deltas from v1)

Pure-TS, offline-first, zustand+AsyncStorage (persist bumped to v8). New/changed slices:

- `knowledge: Record<subjectId, KnowledgeBase>` — seeded topics + distilled brief.
- `topicState: Record<topicId, { confidence: number; coverage: "none"|"learning"|"confident"; updatedAt }>`.
- `reflections: Reflection[]` (with raw transcript) — the tutor's memory.
- `deck: DeckPlan | null` + `deckStaleAt` — cached tutor layout + freshness.
- `garden: { plants: Plant[] }`; `focusSessions: FocusSession[]` (richer than v1).
- `studentModel` — a derived selector assembling {subjects, exams, plan, topicState, recent reflections, corrections, KB briefs} — the single object passed to every tutor call.
- New `generate()` tasks: `plan_deck`, `distill_reflection`, `seed_knowledge`, plus existing `quiz`/`grade_feynman`/block-parse. All fail-safe (fallback deck / keep raw transcript / no-op) so the app degrades, never breaks.

**Boundaries:** MiniMax = judgment + words (deck emphasis, distillation, seeding, chat). Engine = math (hours, placement, coverage %). Reducers = the only writers of state; the tutor proposes, reducers/engine dispose.

---

## Build sequence (sub-projects, each its own plan → build → verify)

Usable and better after every step; each keeps tests green and is verified locally (in-app / local web export — **no hosted artifacts**).

- **SP1 — Orbit identity system.** Theme tokens (light+dark, system-adaptive), `<Surface>`, and the core components: `OrbitRing`, `Ridge`, `CoachCard`, `CardDeck` renderer with fallback deck, garden glyphs. Re-skin Home to render a *static* fallback deck bound to live data. (Biggest visual payoff; unblocks everything.)
- **SP2 — Kill mock data + honest empty states.** Remove fabricated numbers; orbits show countdown-only until real data exists.
- **SP3 — Voice reflection loop.** Reflect UI + ASR tiers (dev-build native / box-whisper / typed) + `distill_reflection` + reducers → coverage rings + corrections.
- **SP4 — Tutor deck planner.** `plan_deck` + staleness/caching + `studentModel` selector; Home deck becomes tutor-arranged (fallback still guaranteed).
- **SP5 — NotebookLM seeding + dynamic Practice.** Seed flow + `seed_knowledge` + KB-driven Practice/topic pickers.
- **SP6 — Garden focus timer.** Custom durations, grow/wilt, richer `focus_sessions`, coins + reflection handoff.
- **SP7 — AI tutor chat.** Grounded chat + safe action tools routing through engine/reducers.

Deferred to SDK 56 / native build (unchanged): Liquid Glass into `<Surface>`, Siri App Intents, lock-screen widget, and on-device `whisper.rn` (needs the native AltStore build; box-Whisper covers the gap until then). Deferred to production: onboarding flow, IAL RAG knowledge base.

## Verification per sub-project
- Engine/reducers: unit tests (coverage math, deck fallback validity, reflection application, no lost hours).
- App: run locally, exercise the loop — reflect → rings move → deck re-plans → week reflows; empty states show invitations not fake fill.
- Degradation: with LLM/ASR unavailable, deck falls back, transcript is kept, nothing blanks or crashes.
