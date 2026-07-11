# Reflow × Nothing — UI Redesign Spec (2026-07-11)

Full re-skin of Reflow from the warm editorial "Orbit" identity to the **Nothing**
design language (monochrome · dot-matrix · industrial minimalism). Source of
truth for the visual language: `vibe-nothing-ui-design` (DESIGN.md + tokens.css),
inspired by nothing.tech.

## Decisions (locked)

| Question | Decision |
|---|---|
| Scope | **Full commit** — retire the warm/serif identity across the whole app |
| Fonts | **Full swap**: Doto (numerals) · Geist (body) · Geist SemiBold (headings) · Geist Mono (labels/data) · Newsreader Italic (page accent). SIL OFL 1.1, bundled in `assets/fonts/`. |
| Theme | **Light + dark adaptive** (both defined; signal-red holds on both) |
| Subjects | **Full monochrome** — differentiate by Geist Mono label, not hue |
| Garden emoji | Converted to a **dot-matrix grid** (one filled dot per session) |
| Motion | **Mechanical** — springs → 120–400ms ease-in-out timing; haptics stay |

## Principles (from Nothing DESIGN.md)

1. Black/grey/white dominate; the **signal-red `#D71921`** is scarce — only for
   genuine signals (overdue/urgent countdown, `NEEDS INPUT`, live/running,
   over-limit/behind-pace). Countable on one hand per screen.
2. **Active controls invert black↔white**, they don't colorize.
3. Structure from **1px hairlines + whitespace**, never shadows/gradients.
4. **Typography does the hierarchy** — size jumps + font roles, not color.
5. **Dot-matrix is the native tongue** — standalone numbers in Doto, labels in
   Geist Mono uppercase, a sparse dot-field background.
6. Motion is mechanical: opacity drop + small translate, no spring rebound.

## Architecture — one-file re-skin

Everything pivots on `src/theme/tokens.ts`:
- **Palette**: every legacy key (`bg`, `surface`, `text`, `accent`, …) preserved
  but remapped onto Nothing greyscale, so 30+ consumers re-skin instantly. New
  Nothing keys added: `display`, `raised`, `line2`, `dotbg`, `accentText`.
- **Type scale**: same role keys, repointed families. `data`/`numeral`/`numeralLg`
  → Doto; `hero`/`title`/`headline` → Geist SemiBold; `body`/`callout`/`footnote`
  → Geist; `caption`/`mono` → Geist Mono uppercase; `serif`/`heroItalic` →
  Newsreader Italic (page-level only).
- **Radius**: capped at 8 (`sm` 6 / `md`,`lg`,`xl` 8 / `pill`).
- **subjectColors**: all resolve to one muted grey (monochrome).

Fonts registered in `app/_layout.tsx` via `useFonts`.

## New primitives (`src/components/`)

- **`Hairline`** — 1px divider (the only structural line).
- **`SegmentedBar`** — signature discrete-squares meter; `display` fill, `line`
  empties, signal-red on over-limit. Pairs with a Doto readout.
- **`DotField`** — sparse `react-native-svg` dot background (`dotbg`, ~72px). RN
  has no `mix-blend-mode:difference`, so this is a theme-aware two-tone
  approximation, not the auto-inverting web trick. Sits behind cards.
- **`Surface`** (updated) — flat card, 1px hairline, **no shadow**; iOS 26+ still
  gets native Liquid Glass (on-brand: Nothing cards are frosted glass), guarded
  so a missing pod degrades to flat instead of crashing launch (see
  `glassSupport.ts`).
- **`PressableScale`** (updated) — mechanical press: opacity → .8 + translateY −2,
  120ms ease-in-out, no spring. `OrbitRing` → Nothing gauge (monochrome arc, Doto
  numeral, signal-red only when urgent). `Garden` → dot-matrix grid.

## Rollout

- **A — Foundation** (done): tokens + fonts. Whole app greyscales + re-types.
- **B — Primitives** (done): Hairline, SegmentedBar, DotField, Surface,
  PressableScale, OrbitRing, Garden.
- **C — Per-screen sweep** (in progress, parallelized over disjoint file sets):
  Doto numbers, mono-uppercase labels, kill emoji/shadows, invert active states,
  signal-red only on signals, dot-field backgrounds.
- **D — Verify**: `npm test`, `tsc --noEmit`, `npx expo export -p web`,
  web-export screenshots in both themes.

## Known fidelity gaps (accepted)

1. **Dot-field can't auto-invert** like the CSS `difference` blend — two-tone
   approximation instead.
2. **Doto is a variable font** (ROND axis). RN `useFonts` renders its default
   instance; the round `ROND=100` look needs on-device verification (Linux/web
   can't confirm it).
