# Reflow × Nothing — Premium Polish + IA Restructure (2026-07-11)

Second-pass redesign. The first Nothing re-skin (`2026-07-11-nothing-ui-redesign.md`)
swapped tokens/fonts correctly but the *composition* read "gimmicky / vibecody":
dot-matrix overused at tiny low-contrast sizes (looked broken), every element a
sharp-cornered bordered box, ~8 dashboard sections crammed on Home, and red
sprayed as alarm across the screen. This spec fixes the **execution + information
architecture** — the layers a token-only reskin can't reach.

Design direction validated with two Fable (design) consultations and live web-export
mockups rendered with the actual bundled fonts (`dist/mockup.html`, `dist/cards.html`).

## Root-cause diagnosis (from rendered screenshots)

1. **Doto misused** — dot-matrix on every timestamp/stat at 17px and dimmed → reads
   as a dead LCD / failed font load. It should be a *scalpel*: one hero number per
   screen, ≥40px, full contrast.
2. **Doto renders light** — `Doto.ttf` is a variable font; RN renders its default
   instance (thin/square), compounding the "broken" look. Needs a baked heavy static
   instance (RN ignores `fontWeight` on variable families).
3. **Density / altitude** — Home stacked 8 competing zones; premium Nothing is
   one-thing-per-viewport with radical whitespace.
4. **Box-everything** — sharp 1px bordered boxes on every element = anxiety-inducing
   form-field texture, not calm.
5. **Red creep** — 7+ red hits/screen (MISSED, BEHIND, NEEDS INPUT×3…) → alarm
   fatigue, kills the "scarce signal" premise.

## Decisions (locked)

| Question | Decision |
|---|---|
| Fonts | **IBM Plex Mono** throughout — SemiBold headings, Regular body/labels/data — + **DotGothic16** for hero numerals only. Both SIL-OFL. Retire Geist, Space Grotesk, Space Mono, and Doto. (Chosen over Space Grotesk/Space Mono/Doto after a live type-lab render: one mono family reads as a single engineered system, and Plex Mono is thematically exact — Nothing's real fonts were inspired by 1980s IBM mainframe type.) |
| Why not real Nothing fonts | Ndot / NType82 / NType82 Mono are **proprietary, license-locked to Nothing's own brand materials** ("must not share… solely on Nothing brand materials"). Illegal to ship in a public OSS repo. IBM Plex Mono is the license-safe technical-mono substitute; DotGothic16 the dot-matrix substitute. |
| Hero numeral | **DotGothic16** (solid pixel digits) — chosen over Doto because Doto's variable weight axis barely renders on-device (both 400/900 look thin → the "broken LCD" look). DotGothic16 is bold, legible, unambiguous. Numerals only, ≥40px, full contrast, one hero per screen. |
| Long-form reading | Plex Mono for body is Fable-endorsed ("quiet, not cold"). **Verification watch-item:** if all-mono proves tiring for genuinely long copy (tutor chat, reflections, textbook notes), fall back to **IBM Plex Sans** for those specific long-form surfaces — same family, keeps coherence. |
| Shape language | Cards **20px** radius **keeping their 1px hairline** (Fable: "round the corners, keep the ruler" — a rounded box *with* a hairline is Nothing; without it, it's Headspace). Primary action = **full pill** (one per screen). Chips 8px. Circles **only** for the timer ring + garden tile. Structural list rows + section dividers stay hard-edged (no radius). |
| Card fill | **A — hairline only, no fill** (keeps OLED black pure; crisper/less generic than a filled card). |
| Red rule | Red marks **only the current/next action** ("NOW" / the live session) — a compass, not a siren. Missed / behind-pace / needs-input all go **grey**. Max ~3 red hits/screen, ideally 1. |
| Calm levers | 32px base inter-zone gap, **64px** below the hero; done items fade to ~35% opacity (no checkmark badges); 3 greys max; motion 300–400ms ease-out, no bounce/parallax. |
| Scope | **Full** — visual polish **+ IA restructure** (new tabs, merged screens, contextual auto-surfacing) **+ KB-backed textbook reader with Apple Pencil annotation**. The last item forces a native build (see Architectural shift). |

## Information architecture (Fable) — the structural fix

The old Home was cluttered *because* the nav was shallow: with Home/Week/Practice/More,
every feature fought for a Home card to avoid burial in "More". Fix the IA and the
clutter has nowhere to come from.

### Tabs: `Now · Plan · Practice · Progress` (retire "More")

- **Now** (home) — the single "what do I do right now" screen.
- **Plan** — Week schedule + tap-to-reflow + **Availability** (renamed from "Week":
  it's where you *change* the plan).
- **Practice** — questions + **past-paper logging** + **Corrections** (one loop:
  do questions → log mistakes → confidence updates).
- **Progress** — **Readiness** (with **Orbit gauges merged in** — one ring per
  subject = coverage + days-to-exam, not two redundant gauges) + **Insights** +
  **Rewards** + **Garden**. Every "how am I doing" surface, one scroll.
- **Tutor** — NOT a tab: a persistent chat glyph in the header of *every* screen,
  passing current-screen context into the chat.
- **Settings** — a gear in the Now header.

### Home ("Now") — 4 zones only

1. **Hero** — current/next session: subject, topic, dot-matrix time, one pill
   **Start**. The app's answer to "what now."
2. **Coach note** — one AI line (Plex Mono) under the hero.
3. **Today** — remaining sessions as a quiet list ("2 of 4 done"). Tap = done,
   long-press = skip/reflect.
4. **Ambient strip** — one hairline footer row, pure monochrome: streak · garden
   glyph · nearest-exam countdown. Tapping opens Progress. This is where
   Rewards/Garden/Readiness get a *cue* without a *card*.

**Hard rule (anti-regression):** Home may show *only* the next action, today, and the
ambient strip. Anything that **reports state** rather than **demanding action** lives
in Progress or earns a *moment* (auto-push / inline prompt) — never a permanent card.

### Reachability (taps from cold open) — nothing > 2 taps

| Feature | Path | Taps |
|---|---|---|
| Now | opens here | 0 |
| Timer | Now → Start | 1 |
| Plan (Week) | Plan tab | 1 |
| Reflow | Plan → tap slot | 2 |
| Practice | Practice tab | 1 |
| Reflect | **auto-push when Timer ends** / Now → long-press done session | 0 / 2 |
| Tutor | header glyph, any screen | 1 |
| Settings | Now → gear | 1 |
| Availability | Plan → "Blocks" pill / long-press empty slot | 2 |
| Corrections | Practice → section / **auto-offered after logging a paper** | 2 / 0 |
| Insights | Progress tab | 1 |
| Rewards | Progress scroll / ambient strip tap | 1–2 |
| Readiness | Progress, first section | 1 |
| Garden | Progress / **alive in Timer** | 1 / 0 |
| Orbit gauges | merged into Readiness rows | 1 |
| Textbook/Library | Practice → Library / **"Open material" from a session** | 2 / 1 |

### Three core flows (must feel inevitable)

- **(a) Do the session:** open → hero shows it → **Start** → Timer runs, plant grows →
  timer ends → **Reflect auto-opens** pre-selected → type a line → tutor feedback inline
  → back to Now (hero shows next, Today shows 3/4). Two deliberate taps.
- **(b) Something changed:** Plan → long-press busy slot → "Add block: dinner 6–8" (NL
  parser) → plan reflows → red **Undo** banner 10s. / Missed → Now → long-press row →
  Skip → "Reflow week?" snackbar → tap.
- **(c) Weekly check-in:** Progress → **Log paper** (the one red action) → enter score →
  readiness ring animates → "3 topics missed — add corrections?" → Corrections
  pre-filled → allocator reweights next week silently.

### Gestures / contextual surfacing (removes taps)

- Timer end **auto-pushes Reflect** (flagship "app comes to you").
- Logging a paper **offers Corrections** inline, pre-filled.
- Tap session = done; long-press = skip/reflect (existing pattern — keep).
- Swipe down on Now hero = peek full agenda; swipe left = skip to next session.
- Any reflow = **Undo banner**, never a menu.

## Implementation surface

### Tokens (`src/theme/tokens.ts`)
- `fonts`: repoint `ui`→IBM Plex Mono Regular, `uiSemi`→IBM Plex Mono SemiBold,
  `mono`/`monoMed`→IBM Plex Mono Regular/SemiBold, `doto`→DotGothic16. Drop Geist refs.
- `radius`: cards 20, pill 999, chip 8. Keep hairline dividers unrounded.
- `type`: hero numerals DotGothic16 ≥40px full-contrast; labels Plex Mono uppercase;
  body/headings Plex Mono (SemiBold for headings).
- Add a `red = current-action-only` convention; retire alarm-red usages.

### Fonts (`assets/fonts/`, `app.json` expo-font plugin, `app/_layout.tsx`)
- Add `IBMPlexMono-Regular.ttf`, `IBMPlexMono-SemiBold.ttf` (both static already), and
  `DotGothic16-Regular.ttf` (static). Keep `IBMPlexSans-Regular` on hand as the
  long-form fallback (see Decisions). No variable-font instancing needed — all static.
- Register by PostScript name (build-time embed via the expo-font config plugin, NOT
  runtime `useFonts` — the v1.0.8 SIGABRT lesson stands). Verify PS names with fontTools
  against the `.ttf` name tables. Remove Geist / Space Grotesk / Space Mono / Doto files.
- `tokens.ts` `fonts`: `ui`→IBMPlexMono-Regular, `uiSemi`→IBMPlexMono-SemiBold,
  `mono`/`monoMed`→IBMPlexMono-Regular/SemiBold, `doto`→DotGothic16-Regular.

### Navigation (`app/(tabs)/`)
- Rename/reorganize tabs → `now` (was index), `plan` (was week + availability),
  `practice` (+ past papers + corrections), `progress` (readiness + insights + rewards
  + garden). Delete `more.tsx`. Add Tutor header glyph + Settings gear as shared header
  elements. Preserve deep links / avoid orphaning (the whole reason the tab spine exists).

### Components (`src/components/`)
- `Surface` → 20px radius, hairline, no fill, no shadow.
- New `Pill` (primary action), `AmbientStrip` (home footer), `SubjectReadinessRow`
  (readiness + merged orbit ring).
- `PressableScale` → confirm mechanical 300–400ms ease-out (no spring bounce).
- Merge `OrbitRow`/`OrbitRing` into the readiness row; retire standalone gauges from Home.

### Per-screen sweep
Now, Plan, Practice, Progress, Timer, Reflect, Tutor, Setup, Corrections, Insights,
Rewards, Availability — apply hero-numeral discipline (DotGothic16, one per screen),
Plex Mono type, 20px+pill shapes, grey-not-red, whitespace rhythm; wire the
auto-surfacing flows.

## Textbook reader + Apple Pencil annotation (KB-backed)

New feature, folded into this plan by user decision. Builds **on the existing KB**, not
beside it: the `Source` model (`src/state/model.ts`) already stores `pdf | youtube | link`
records per subject with a RAG `ingested` flag. The textbook view is a new full-screen
reader over `Source` records of `type: "pdf"`, plus a new annotation layer.

### Placement in IA
- Lives in the **Practice** tab (the study-material + practice + corrections loop) as a
  "Library / Textbooks" section listing `pdf` sources.
- **Contextual entry** (the natural path): the Now hero and each session expose an "Open
  material" affordance that jumps straight into the reader at the source tied to that
  subject/topic — reading during a session should be 1 tap, not a tab dive.

### Data model (new)
- `Annotation { id, sourceId, page, kind: "ink" | "highlight" | "note", data, color,
  createdAt }` where `data` = serialized ink strokes (points + pressure) or a highlight
  rect / note anchor. Add reducers `addAnnotation` / `removeAnnotation` / `annotationsFor
  (sourceId, page)`. Persist bump (store schema v10). Annotations are **local-first**
  like everything else; ink stays on-device.

### Rendering + pen stack
- **PDF:** `react-native-pdf` (native) or a `pdf.js`-in-WebView fallback — evaluate both
  in the plan's first native phase; pick per launch-stability + Pencil-overlay feasibility.
- **Ink canvas:** `@shopify/react-native-skia` for the annotation overlay (pressure/tilt
  handwriting, highlighter, eraser, ink layers) + `react-native-gesture-handler` for
  Pencil/touch routing. A Nothing-style **pen toolbar**: monochrome tool dots, one
  signal-red = active tool, pill container, 20px radius.
- Pencil-only palm-rejection: route `UITouch.type == .pencil` to ink, finger to
  scroll/pan (gesture-handler discrimination).

## Architectural shift — native build (MAJOR, mostly one-way)

Textbook+pen forces native modules (`react-native-pdf`/WebView, `react-native-skia`,
`gesture-handler`), which **cannot run in Expo Go**. This moves Reflow from
"Expo-Go-installable" to **requires a custom dev/EAS build** — deliberately re-entering
the native-module territory that the **entire v2.0.0 rebuild was created to escape** (the
`expo-updates` / `whisper.rn` / `expo-notifications` launch-crash class; see memories
`reflow-sdk54-rebuild-v2`, `reflow-launch-crash-expo-updates`).

**This is accepted, with mandated mitigation:**
1. **Native modules land in their OWN early phase**, behind a guarded boundary + the
   existing `ErrorBoundary`, each import wrapped like `notify.ts`'s guard so a missing/
   incompatible pod degrades instead of SIGABRT-ing launch.
2. **Cold-launch on a real device is the first gate** after adding any native module —
   before building UI on top. Keep `docs/crash-logs/capture.sh` in the loop.
3. **One native module at a time**, each shipped + launch-verified before the next
   (gesture-handler → skia → pdf), so a crash is attributable.
4. If a module proves unstable on RN 0.81.5 / SDK 54, the reader degrades to a
   **read-only PDF (no ink)** rather than blocking the whole release.
5. The Expo-Go-safe polish (fonts, shapes, IA) ships and is verified **first** and
   independently, so the stable app exists regardless of how the native work lands.

## Out of scope (explicit)
- **Local audio / whisper.rn transcription** — still out. Even though we're taking on a
  native build, whisper.rn specifically was a repeat launch-crash offender across 8
  versions; re-adding it is its own scoped task, not a rider on this one.
- Real Nothing proprietary fonts — license-barred (see Decisions).
- Server-side RAG ingestion of textbooks (the `ingested` pipeline) — the reader displays
  and annotates; RAG retrieval is separate (KB #7, user-provides-PDFs gated).

## Verification
- `npm test` (128+), `tsc --noEmit`, `npx expo export -p web`.
- Web-export screenshots of every screen, both themes, phone + iPad width (bundled
  chromium + playwright-core harness).
- **On-device font check** — DotGothic16 numerals render solid and Plex Mono body is
  comfortable (Linux/web can't fully confirm on-device rendering).
- Reachability audit: every feature ≤2 taps; no orphaned screen; the 3 flows walk
  end-to-end.
- **Native cold-launch gate (blocking)** — after EACH native module (gesture-handler →
  skia → pdf), install on a real device via the SideStore pipeline and confirm the app
  launches without SIGABRT before building further. `capture.sh` ready to grab any crash.
- **Pen loop on device** — Pencil ink draws with pressure, palm-rejection works, ink
  persists across app restart (annotations round-trip through AsyncStorage).

## Known fidelity gaps (accepted)
- DotField can't auto-invert (RN has no `mix-blend-mode:difference`) — two-tone
  approximation, kept sparse/even.
- Swipe gestures on the hero are polish, not load-bearing — degrade gracefully to the
  tap paths if deferred.
