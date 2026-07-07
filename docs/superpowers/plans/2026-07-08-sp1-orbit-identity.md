# SP1 — Orbit Identity System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the retired "Exam Almanac" look with the system-adaptive **Orbit** identity and rebuild Home as a tutor-style card deck (rendered from a deterministic fallback deck for now), so the app matches the approved mockup and the later sub-projects have their visual foundation.

**Architecture:** Pure-TS logic (ring/ridge geometry, deck model + fallback builder) is TDD'd under vitest. React-Native presentational components (`OrbitRing`, `Ridge`, `CoachCard`, `Garden`, `CardDeck`) consume that logic and are verified by typecheck + a local web export render. Home (`app/index.tsx`) is rewritten to assemble a `DeckPlan` from live state and render it through `CardDeck`. One token rewrite (`src/theme/tokens.ts`) re-skins the whole app because every existing token key is preserved.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, `react-native-svg` (new, Expo-bundled), zustand, vitest.

## Global Constraints

- **Expo SDK 54 only** — do NOT bump to 55/56. No native-only modules in this SP (must run in Expo Go).
- **Offline-first, on-device.** No network calls added in SP1.
- **MiniMax is the only LLM**, behind `generate()` — but SP1 adds no LLM calls (deck is the deterministic fallback; the `plan_deck` tutor call is SP4).
- **No hosted artifacts / no claude.ai publishing.** Visual verification is local only (`npx expo export -p web` + local http server).
- **Tests stay green; engine stays pure TS.** New logic is TDD'd with vitest. Pure modules must not call `Date.now()`/`Math.random()`/`new Date()` with no args — pass timestamps in.
- **Persisted state shape is unchanged in SP1** → keep zustand persist name `reflow-state-v7` (do NOT bump).
- **Preserve every existing token key** in `tokens.ts` (`colors.*`, `type.*`, `spacing`, `radius`, `subjectColors`) so other screens keep compiling. Only values and the Home screen change.
- Type scale uses **system SF** (omit Fraunces): each `type.*` entry carries `fontWeight` and an explicit `fontFamily: undefined` so existing `type.x.fontFamily` reads still typecheck.

---

## File Structure

- `package.json` — add `react-native-svg` dependency (via `npx expo install`).
- `src/theme/tokens.ts` — **rewrite** to Orbit tokens (light+dark values, SF type scale, subject colours). Same keys.
- `src/theme/tokens.test.ts` — **create**. Contract test: both themes expose every colour key; type scale complete.
- `src/theme/theme.ts` — unchanged API; verify it still resolves the rewritten palette.
- `src/ui/geometry.ts` — **create**. Pure ring + ridge math.
- `src/ui/geometry.test.ts` — **create**. TDD for geometry.
- `src/ui/deck.ts` — **create**. Card catalog types, `sanitizeDeck`, `buildFallbackDeck`.
- `src/ui/deck.test.ts` — **create**. TDD for deck model.
- `src/components/OrbitRing.tsx` — **create**. One subject orbit (SVG).
- `src/components/OrbitRow.tsx` — **create**. Row of orbits.
- `src/components/Ridge.tsx` — **create**. Momentum ridge (SVG).
- `src/components/CoachCard.tsx` — **create**. Tutor message card.
- `src/components/Garden.tsx` — **create**. Garden peek strip.
- `src/components/CardDeck.tsx` — **create**. Maps a `DeckPlan` to components; skips unknown card types.
- `app/index.tsx` — **rewrite**. Build a fallback `DeckPlan` from live state, render via `CardDeck`.

Home currently imports helpers that stay valid: `computePlan`, `sessionKeyOf` (`src/state/model.ts`), `daysToNearestExam` (`src/lib/buildWeek.ts`), `focusMinutesOn` (`src/state/model.ts`), `fmtHours`/`fmtTime`/`weekdayShort` (`src/lib/format.ts`), `useStore` (`src/state/store.ts`), `useTheme` (`src/theme/theme.ts`).

---

## Task 1: Orbit theme tokens

**Files:**
- Modify: `package.json` (add `react-native-svg`)
- Modify: `src/theme/tokens.ts` (rewrite values + type scale; same keys)
- Test: `src/theme/tokens.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `palette.light` / `palette.dark` each with keys `bg, surface, separator, text, textDim, textFaint, accent, accentSoft, gold, goldSoft, danger, success, warning`. `type` with keys `hero, heroItalic, largeTitle, title, serif, headline, body, callout, footnote, caption, data` (each a `TextStyle` with `fontWeight` + `fontFamily: undefined`). `spacing`, `radius` unchanged. `subjectColors: Record<string,string>` with keys `Mathematics, Physics, Psychology, Computer Science`.

- [ ] **Step 1: Install react-native-svg (Expo-pinned)**

Run: `cd ~/reflow && npx expo install react-native-svg`
Expected: `package.json` gains `"react-native-svg": "<expo-pinned>"`; no peer errors.

- [ ] **Step 2: Write the failing token contract test**

Create `src/theme/tokens.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { palette, type, subjectColors, spacing, radius } from "./tokens";

const COLOR_KEYS = [
  "bg","surface","separator","text","textDim","textFaint",
  "accent","accentSoft","gold","goldSoft","danger","success","warning",
] as const;
const TYPE_KEYS = [
  "hero","heroItalic","largeTitle","title","serif",
  "headline","body","callout","footnote","caption","data",
] as const;

describe("Orbit tokens", () => {
  test("both themes expose every colour key", () => {
    for (const scheme of ["light","dark"] as const)
      for (const k of COLOR_KEYS)
        expect(palette[scheme][k], `${scheme}.${k}`).toMatch(/^#|rgba?\(/);
  });
  test("light and dark accents differ (system-adaptive, not inverted)", () => {
    expect(palette.light.accent).not.toBe(palette.dark.accent);
  });
  test("type scale is complete and SF-based (no Fraunces family)", () => {
    for (const k of TYPE_KEYS) {
      expect(type[k], k).toBeDefined();
      expect((type[k] as any).fontFamily ?? undefined).toBeUndefined();
    }
  });
  test("subject colours cover all four subjects", () => {
    for (const s of ["Mathematics","Physics","Psychology","Computer Science"])
      expect(subjectColors[s]).toMatch(/^#/);
  });
  test("spacing and radius keep their scale", () => {
    expect(spacing.lg).toBe(16);
    expect(radius.pill).toBe(999);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/theme/tokens.test.ts`
Expected: FAIL (current tokens use Fraunces `fontFamily` on `type.*`, and old accent hexes).

- [ ] **Step 4: Rewrite `src/theme/tokens.ts`**

```ts
import type { TextStyle } from "react-native";

/**
 * "Orbit" identity — system-adaptive. Light = warm editorial (kraft paper,
 * burnt-orange). Dark = glass at night (violet-biased near-black, violet accent,
 * amber for rewards). SF (system) carries type; the subject ORBIT ring is the
 * signature. Every token key from the previous identity is preserved so the
 * whole app re-skins from this one file.
 */
export const palette = {
  light: {
    bg: "#EFE7D6",            // warm kraft paper
    surface: "#F7F1E4",       // raised card
    separator: "rgba(38,34,28,0.10)",
    text: "#26221C",
    textDim: "#8C8069",
    textFaint: "#B6A988",
    accent: "#D9541E",        // burnt orange
    accentSoft: "#F4DCC8",
    gold: "#C8862E",          // rewards: coins / streak / XP (warm, distinct from accent)
    goldSoft: "rgba(200,134,46,0.15)",
    danger: "#C7503C",
    success: "#3F9E6A",
    warning: "#E7A339",
  },
  dark: {
    bg: "#141219",            // violet-biased near-black
    surface: "#211E2B",       // glass card
    separator: "rgba(233,229,242,0.10)",
    text: "#E9E5F2",
    textDim: "#8A839C",
    textFaint: "#5B5470",
    accent: "#8B6FFF",        // violet
    accentSoft: "#26203F",
    gold: "#E7A339",          // amber rewards glow
    goldSoft: "rgba(231,163,57,0.16)",
    danger: "#E0705B",
    success: "#5FB088",
    warning: "#E7A339",
  },
} as const;

export type Palette = Record<keyof (typeof palette)["light"], string>;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 } as const;

/**
 * Type scale on system SF. `fontFamily` is explicitly `undefined` (system font)
 * so `fontWeight` is honoured AND existing `type.x.fontFamily` reads still
 * typecheck. Heavy tight weights for display; tracked uppercase for captions.
 */
const t = (
  fontSize: number,
  lineHeight: number,
  fontWeight: TextStyle["fontWeight"],
  extra: Partial<TextStyle> = {},
): TextStyle => ({ fontFamily: undefined, fontSize, lineHeight, fontWeight, ...extra });

export const type = {
  hero:       t(34, 38, "800", { letterSpacing: -0.6 }),
  heroItalic: t(30, 34, "800", { letterSpacing: -0.4, fontStyle: "italic" }),
  largeTitle: t(28, 32, "800", { letterSpacing: -0.4 }),
  title:      t(22, 26, "700", { letterSpacing: -0.2 }),
  serif:      t(20, 27, "600"), // "serif" key retained; now a calm strong title
  headline:   t(16, 20, "700"),
  body:       t(15, 22, "400"),
  callout:    t(14, 20, "500"),
  footnote:   t(13, 18, "500"),
  caption:    t(11, 14, "700", { letterSpacing: 1.4, textTransform: "uppercase" }),
  data:       t(16, 20, "700", { fontVariant: ["tabular-nums"] }),
} as const;

/** Subject accent colours — carry both themes. */
export const subjectColors: Record<string, string> = {
  Mathematics: "#5B6CFF",
  Physics: "#2E9E8F",
  Psychology: "#C65B7C",
  "Computer Science": "#7DA13A",
};
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/theme/tokens.test.ts && npm run typecheck`
Expected: token test PASS; `tsc` clean (all screens still compile against preserved keys).

- [ ] **Step 6: Run the full suite (no regressions)**

Run: `npm test`
Expected: all existing engine/state tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/theme/tokens.ts src/theme/tokens.test.ts
git commit -m "feat(sp1): Orbit theme tokens (light editorial / dark glass, SF type) + react-native-svg"
```

---

## Task 2: Ring & ridge geometry (pure)

**Files:**
- Create: `src/ui/geometry.ts`
- Test: `src/ui/geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ringMetrics(coverage: number | undefined, radius: number): { circumference: number; dashOffset: number }` — `coverage` undefined ⇒ `dashOffset === circumference` (empty ring, countdown-only); else clamps 0..1.
  - `examMarkerAngleDeg(daysToExam: number | null, windowDays?: number): number | null` — null ⇒ null; else `-90 + frac*360` where `frac = 1 - clamp(daysToExam/windowDays,0,1)` (default `windowDays = 365`).
  - `pointOnCircle(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number }`.
  - `ridgePath(values: number[], width: number, height: number, pad?: number): { line: string; area: string; points: { x: number; y: number }[] }`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/geometry.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { ringMetrics, examMarkerAngleDeg, pointOnCircle, ridgePath } from "./geometry";

describe("ringMetrics", () => {
  test("undefined coverage leaves the ring empty (offset == circumference)", () => {
    const r = 32, m = ringMetrics(undefined, r);
    expect(m.circumference).toBeCloseTo(2 * Math.PI * r, 6);
    expect(m.dashOffset).toBeCloseTo(m.circumference, 6);
  });
  test("full coverage closes the ring (offset 0)", () => {
    expect(ringMetrics(1, 32).dashOffset).toBeCloseTo(0, 6);
  });
  test("half coverage offsets half the circumference", () => {
    const m = ringMetrics(0.5, 32);
    expect(m.dashOffset).toBeCloseTo(m.circumference / 2, 6);
  });
  test("out-of-range coverage clamps", () => {
    expect(ringMetrics(2, 32).dashOffset).toBeCloseTo(0, 6);
    expect(ringMetrics(-1, 32).dashOffset).toBeCloseTo(ringMetrics(0, 32).circumference, 6);
  });
});

describe("examMarkerAngleDeg", () => {
  test("no exam ⇒ null", () => {
    expect(examMarkerAngleDeg(null)).toBeNull();
  });
  test("exam today sits furthest round (frac 1 ⇒ 270°)", () => {
    expect(examMarkerAngleDeg(0)).toBeCloseTo(270, 6);
  });
  test("exam a full window away sits at the top (-90°)", () => {
    expect(examMarkerAngleDeg(365, 365)).toBeCloseTo(-90, 6);
  });
  test("nearer exam ⇒ larger angle than farther exam", () => {
    expect(examMarkerAngleDeg(30)!).toBeGreaterThan(examMarkerAngleDeg(300)!);
  });
});

describe("pointOnCircle", () => {
  test("-90° is straight up from centre", () => {
    const p = pointOnCircle(39, 39, 36, -90);
    expect(p.x).toBeCloseTo(39, 6);
    expect(p.y).toBeCloseTo(3, 6);
  });
});

describe("ridgePath", () => {
  test("first and last points span the padded width at the data extremes", () => {
    const { points } = ridgePath([10, 0, 20], 100, 40, 4);
    expect(points).toHaveLength(3);
    expect(points[0]!.x).toBeCloseTo(4, 6);
    expect(points[2]!.x).toBeCloseTo(96, 6);
    // max value (20) sits at the top padding; min (0) at the bottom baseline
    expect(points[2]!.y).toBeCloseTo(4, 6);
    expect(points[1]!.y).toBeCloseTo(36, 6);
  });
  test("line starts with a moveTo and area closes back to the baseline", () => {
    const { line, area } = ridgePath([1, 2], 100, 40, 4);
    expect(line.startsWith("M")).toBe(true);
    expect(area.trimEnd().endsWith("Z")).toBe(true);
  });
  test("a single value is handled without NaN", () => {
    const { points } = ridgePath([5], 100, 40, 4);
    expect(points).toHaveLength(1);
    expect(Number.isNaN(points[0]!.x)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/geometry.test.ts`
Expected: FAIL with "Failed to resolve import ./geometry".

- [ ] **Step 3: Implement `src/ui/geometry.ts`**

```ts
/** Pure geometry for the Orbit ring and the momentum ridge. No I/O, no clocks. */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Stroke-dasharray metrics for a coverage ring. `undefined` ⇒ empty ring. */
export function ringMetrics(coverage: number | undefined, radius: number) {
  const circumference = 2 * Math.PI * radius;
  const frac = coverage == null ? 0 : clamp(coverage, 0, 1);
  return { circumference, dashOffset: circumference * (1 - frac) };
}

/** Angle (deg, 0°=east, -90°=north) for the exam marker; nearer exam ⇒ further round. */
export function examMarkerAngleDeg(daysToExam: number | null, windowDays = 365): number | null {
  if (daysToExam == null) return null;
  const frac = 1 - clamp(daysToExam / windowDays, 0, 1);
  return -90 + frac * 360;
}

export function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Smooth ridge line + closed area path from a series of values. */
export function ridgePath(values: number[], width: number, height: number, pad = 4) {
  const n = values.length;
  const max = Math.max(...values, 1);
  const span = n > 1 ? (width - 2 * pad) / (n - 1) : 0;
  const xs = (i: number) => pad + i * span;
  const ys = (v: number) => height - pad - (v / max) * (height - 2 * pad);
  const points = values.map((v, i) => ({ x: xs(i), y: ys(v) }));

  if (n === 1) {
    const p = points[0]!;
    const line = `M ${p.x} ${p.y}`;
    return { line, area: `${line} Z`, points };
  }

  let line = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < n; i++) {
    const a = points[i - 1]!, b = points[i]!, mx = (a.x + b.x) / 2;
    line += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  }
  const area = `${line} L ${points[n - 1]!.x} ${height} L ${points[0]!.x} ${height} Z`;
  return { line, area, points };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/ui/geometry.test.ts`
Expected: PASS (all geometry tests green).

- [ ] **Step 5: Commit**

```bash
git add src/ui/geometry.ts src/ui/geometry.test.ts
git commit -m "feat(sp1): pure ring + ridge geometry (TDD)"
```

---

## Task 3: Deck model + fallback builder (pure)

**Files:**
- Create: `src/ui/deck.ts`
- Test: `src/ui/deck.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `CARD_TYPES` (readonly tuple) and `type CardType = typeof CARD_TYPES[number]`.
  - `type DeckCard = { type: CardType; props?: Record<string, unknown>; reason?: string }`.
  - `type DeckPlan = { cards: DeckCard[]; coachNote?: { body: string; why?: string }; generatedAt: string }`.
  - `buildFallbackDeck(input: { hasToday: boolean; hasSubjects: boolean; generatedAt: string }): DeckPlan` — deterministic ordering, never empty.
  - `sanitizeDeck(raw: unknown, generatedAt: string, fallback: DeckPlan): DeckPlan` — drops unknown/malformed cards; returns `fallback` when the result would be empty or `raw` is not deck-shaped.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/deck.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { buildFallbackDeck, sanitizeDeck, CARD_TYPES } from "./deck";

const NOW = "2026-07-08T20:00:00.000Z";

describe("buildFallbackDeck", () => {
  test("full state orders coach → orbits → do_next → ridge → garden → reflect", () => {
    const d = buildFallbackDeck({ hasToday: true, hasSubjects: true, generatedAt: NOW });
    expect(d.cards.map((c) => c.type)).toEqual([
      "coach_note","orbits","do_next","momentum_ridge","garden_peek","reflect_cta",
    ]);
    expect(d.generatedAt).toBe(NOW);
  });
  test("no sessions today ⇒ do_next is dropped", () => {
    const d = buildFallbackDeck({ hasToday: false, hasSubjects: true, generatedAt: NOW });
    expect(d.cards.map((c) => c.type)).not.toContain("do_next");
  });
  test("no subjects ⇒ orbits dropped but the deck is never empty", () => {
    const d = buildFallbackDeck({ hasToday: false, hasSubjects: false, generatedAt: NOW });
    expect(d.cards.map((c) => c.type)).not.toContain("orbits");
    expect(d.cards.length).toBeGreaterThan(0);
    expect(d.cards.map((c) => c.type)).toContain("reflect_cta");
  });
  test("every card type is in the catalog", () => {
    const d = buildFallbackDeck({ hasToday: true, hasSubjects: true, generatedAt: NOW });
    for (const c of d.cards) expect(CARD_TYPES).toContain(c.type);
  });
});

describe("sanitizeDeck", () => {
  const fb = buildFallbackDeck({ hasToday: true, hasSubjects: true, generatedAt: NOW });
  test("keeps known cards and drops unknown ones", () => {
    const raw = { cards: [{ type: "orbits" }, { type: "garbage" }, { type: "do_next" }] };
    const out = sanitizeDeck(raw, NOW, fb);
    expect(out.cards.map((c) => c.type)).toEqual(["orbits", "do_next"]);
    expect(out.generatedAt).toBe(NOW);
  });
  test("non-deck input falls back", () => {
    expect(sanitizeDeck(null, NOW, fb)).toBe(fb);
    expect(sanitizeDeck({ nope: 1 }, NOW, fb)).toBe(fb);
  });
  test("all-unknown cards fall back rather than render blank", () => {
    expect(sanitizeDeck({ cards: [{ type: "garbage" }] }, NOW, fb)).toBe(fb);
  });
  test("carries a valid coachNote through", () => {
    const out = sanitizeDeck(
      { cards: [{ type: "orbits" }], coachNote: { body: "Focus on Stats." } }, NOW, fb);
    expect(out.coachNote?.body).toBe("Focus on Stats.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/deck.test.ts`
Expected: FAIL with "Failed to resolve import ./deck".

- [ ] **Step 3: Implement `src/ui/deck.ts`**

```ts
/** The tutor's dashboard is a stack of cards drawn from this fixed catalog. */
export const CARD_TYPES = [
  "coach_note","orbits","do_next","momentum_ridge","garden_peek",
  "reflect_cta","past_paper_nudge","correction_review","weakness_spotlight","exam_taper",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export type DeckCard = { type: CardType; props?: Record<string, unknown>; reason?: string };
export type DeckPlan = { cards: DeckCard[]; coachNote?: { body: string; why?: string }; generatedAt: string };

const isCardType = (v: unknown): v is CardType =>
  typeof v === "string" && (CARD_TYPES as readonly string[]).includes(v);

/** Deterministic default layout. Never returns an empty deck. */
export function buildFallbackDeck(input: {
  hasToday: boolean;
  hasSubjects: boolean;
  generatedAt: string;
}): DeckPlan {
  const cards: DeckCard[] = [{ type: "coach_note" }];
  if (input.hasSubjects) cards.push({ type: "orbits" });
  if (input.hasToday) cards.push({ type: "do_next" });
  cards.push({ type: "momentum_ridge" }, { type: "garden_peek" }, { type: "reflect_cta" });
  return { cards, generatedAt: input.generatedAt };
}

/** Validate a raw (e.g. LLM) deck; drop unknown cards; fall back if empty/misshaped. */
export function sanitizeDeck(raw: unknown, generatedAt: string, fallback: DeckPlan): DeckPlan {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as any).cards)) return fallback;
  const cards: DeckCard[] = [];
  for (const c of (raw as any).cards) {
    if (c && typeof c === "object" && isCardType((c as any).type)) {
      cards.push({
        type: (c as any).type,
        props: typeof (c as any).props === "object" ? (c as any).props : undefined,
        reason: typeof (c as any).reason === "string" ? (c as any).reason : undefined,
      });
    }
  }
  if (cards.length === 0) return fallback;
  const note = (raw as any).coachNote;
  const coachNote =
    note && typeof note.body === "string"
      ? { body: note.body, why: typeof note.why === "string" ? note.why : undefined }
      : undefined;
  return { cards, coachNote, generatedAt };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/ui/deck.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/deck.ts src/ui/deck.test.ts
git commit -m "feat(sp1): deck model + deterministic fallback + sanitizer (TDD)"
```

---

## Task 4: OrbitRing + OrbitRow components

**Files:**
- Create: `src/components/OrbitRing.tsx`
- Create: `src/components/OrbitRow.tsx`

**Interfaces:**
- Consumes: `ringMetrics`, `examMarkerAngleDeg`, `pointOnCircle` (Task 2); `useTheme` (`src/theme/theme.ts`); `type, spacing, radius` (`src/theme/tokens.ts`).
- Produces:
  - `OrbitRing(props: { name: string; color: string; daysToExam: number | null; coverage?: number; lead?: boolean; size?: number }): JSX.Element`.
  - `OrbitRow(props: { subjects: { id: string; name: string; color: string; daysToExam: number | null; coverage?: number }[]; leadId?: string }): JSX.Element`.

- [ ] **Step 1: Implement `src/components/OrbitRing.tsx`**

```tsx
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ringMetrics, examMarkerAngleDeg, pointOnCircle } from "../ui/geometry";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

/** One subject as a luminous orbit: fill=coverage, marker=days-to-exam, centre=countdown. */
export function OrbitRing({
  name, color, daysToExam, coverage, lead = false, size = 78,
}: {
  name: string; color: string; daysToExam: number | null;
  coverage?: number; lead?: boolean; size?: number;
}) {
  const { colors } = useTheme();
  const stroke = 6;
  const r = size / 2 - stroke;
  const c = size / 2;
  const { circumference, dashOffset } = ringMetrics(coverage, r);
  const angle = examMarkerAngleDeg(daysToExam);
  const marker = angle == null ? null : pointOnCircle(c, c, r, angle);

  return (
    <View style={{ alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={r} stroke={colors.separator} strokeWidth={stroke} fill="none" />
          <Circle
            cx={c} cy={c} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${c} ${c})`}
          />
          {marker && (
            <Circle cx={marker.x} cy={marker.y} r={4.5} fill={colors.surface} stroke={color} strokeWidth={2.5} />
          )}
        </Svg>
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={[type.data, { color: colors.text, fontSize: 20 }]}>
            {daysToExam == null ? "—" : daysToExam}
          </Text>
          <Text style={[type.caption, { color: colors.textDim, fontSize: 9 }]}>DAYS</Text>
        </View>
      </View>
      <Text style={[type.footnote, { color: colors.text, fontWeight: "700" }]}>{name}</Text>
      <Text style={[type.caption, { color: colors.textDim }]}>
        {coverage == null ? "not started" : `${Math.round(coverage * 100)}% covered`}
      </Text>
      {lead && <View style={{ height: 2, width: 20, backgroundColor: color, borderRadius: 1 }} />}
    </View>
  );
}
```

Note: RN supports `inset` on View style in RN 0.81. If `tsc` rejects `inset`, replace with `top:0,left:0,right:0,bottom:0`.

- [ ] **Step 2: Implement `src/components/OrbitRow.tsx`**

```tsx
import { View } from "react-native";
import { OrbitRing } from "./OrbitRing";
import { Surface } from "./Surface";
import { useTheme } from "../theme/theme";
import { spacing } from "../theme/tokens";

export function OrbitRow({
  subjects, leadId,
}: {
  subjects: { id: string; name: string; color: string; daysToExam: number | null; coverage?: number }[];
  leadId?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {subjects.map((s) => {
        const lead = s.id === leadId;
        return (
          <Surface
            key={s.id}
            padded={false}
            style={{
              flex: 1, paddingVertical: spacing.md, alignItems: "center",
              borderWidth: lead ? 1.5 : (colors.bg === "#141219" ? 1 : 0),
              borderColor: lead ? s.color : colors.separator,
            }}
          >
            <OrbitRing
              name={s.name.length > 8 ? s.name.slice(0, 7) + "…" : s.name}
              color={s.color} daysToExam={s.daysToExam} coverage={s.coverage} lead={lead}
            />
          </Surface>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean (0 errors). If `inset` errors, apply the note in Step 1 and re-run.

- [ ] **Step 4: Commit**

```bash
git add src/components/OrbitRing.tsx src/components/OrbitRow.tsx
git commit -m "feat(sp1): OrbitRing + OrbitRow (the signature) via react-native-svg"
```

---

## Task 5: Ridge, CoachCard, Garden components

**Files:**
- Create: `src/components/Ridge.tsx`
- Create: `src/components/CoachCard.tsx`
- Create: `src/components/Garden.tsx`

**Interfaces:**
- Consumes: `ridgePath` (Task 2); `Surface` (`src/components/Surface.tsx`); `useTheme`; `type, spacing, radius`.
- Produces:
  - `Ridge(props: { values: number[]; labels: string[]; todayIndex: number; totalLabel: string; subLabel?: string }): JSX.Element`.
  - `CoachCard(props: { body: string; why?: string }): JSX.Element`.
  - `Garden(props: { plants: string[]; caption: string }): JSX.Element`.

- [ ] **Step 1: Implement `src/components/Ridge.tsx`**

```tsx
import { View, Text } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { ridgePath } from "../ui/geometry";
import { Surface } from "./Surface";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

const W = 280, H = 56;

export function Ridge({
  values, labels, todayIndex, totalLabel, subLabel,
}: {
  values: number[]; labels: string[]; todayIndex: number; totalLabel: string; subLabel?: string;
}) {
  const { colors } = useTheme();
  const { line, area, points } = ridgePath(values, W, H, 8);
  const today = points[todayIndex];
  return (
    <Surface style={{ paddingBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={[type.title, { color: colors.text }]}>{totalLabel}</Text>
        {subLabel && <Text style={[type.footnote, { color: colors.textDim }]}>{subLabel}</Text>}
      </View>
      <Svg width="100%" height={H + 16} viewBox={`0 0 ${W} ${H + 16}`}>
        <Defs>
          <LinearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#ridge)" />
        <Path d={line} stroke={colors.accent} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {today && <Circle cx={today.x} cy={today.y} r={5} fill={colors.surface} stroke={colors.accent} strokeWidth={2.6} />}
        {points.map((p, i) => (
          <Text
            key={i}
            // labels rendered below via RN Text overlay for reliable fonts
          />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 }}>
        {labels.map((l, i) => (
          <Text key={i} style={[type.caption, { color: i === todayIndex ? colors.accent : colors.textFaint, letterSpacing: 0 }]}>{l}</Text>
        ))}
      </View>
    </Surface>
  );
}
```

Note: the empty `<Text />` inside `<Svg>` is a no-op placeholder loop that must be removed — render labels only in the RN overlay row below the SVG (already present). Delete the `{points.map(...)}` block before committing.

- [ ] **Step 2: Remove the placeholder loop**

Delete the `{points.map((p, i) => ( <Text ... /> ))}` block inside `<Svg>` in `Ridge.tsx`. Labels come only from the overlay `<View>` row.

- [ ] **Step 3: Implement `src/components/CoachCard.tsx`**

```tsx
import { View, Text } from "react-native";
import { useTheme } from "../theme/theme";
import { type, spacing, radius } from "../theme/tokens";

/** The tutor's voice at the top of the deck. */
export function CoachCard({ body, why }: { body: string; why?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
      borderLeftWidth: 3, borderLeftColor: colors.accent, gap: spacing.sm,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 12, color: colors.accent }}>✎</Text>
        </View>
        <Text style={[type.caption, { color: colors.textDim }]}>Your tutor</Text>
      </View>
      <Text style={[type.body, { color: colors.text }]}>{body}</Text>
      {why && <Text style={[type.footnote, { color: colors.textDim }]}>↳ {why}</Text>}
    </View>
  );
}
```

- [ ] **Step 4: Implement `src/components/Garden.tsx`**

```tsx
import { View, Text } from "react-native";
import { Surface } from "./Surface";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

/** Deep-work reward: the garden fills as focus sessions complete. */
export function Garden({ plants, caption }: { plants: string[]; caption: string }) {
  const { colors } = useTheme();
  return (
    <Surface style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2, flex: 1 }}>
        {plants.length === 0
          ? <Text style={[type.footnote, { color: colors.textDim }]}>Your garden grows as you focus.</Text>
          : plants.map((p, i) => <Text key={i} style={{ fontSize: 18 }}>{p}</Text>)}
      </View>
      <View>
        <Text style={[type.caption, { color: colors.textDim }]}>GARDEN</Text>
        <Text style={[type.footnote, { color: colors.text, fontWeight: "700" }]}>{caption}</Text>
      </View>
    </Surface>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/Ridge.tsx src/components/CoachCard.tsx src/components/Garden.tsx
git commit -m "feat(sp1): Ridge + CoachCard + Garden deck cards"
```

---

## Task 6: CardDeck renderer + Home re-skin (integration + visual verify)

**Files:**
- Create: `src/components/CardDeck.tsx`
- Rewrite: `app/index.tsx`

**Interfaces:**
- Consumes: all Task 2–5 components; `DeckPlan`/`buildFallbackDeck` (Task 3); state selectors `computePlan`, `sessionKeyOf`, `focusMinutesOn` (`src/state/model.ts`), `daysToNearestExam` (`src/lib/buildWeek.ts`), `useStore` (`src/state/store.ts`); `fmtHours`, `weekdayShort` (`src/lib/format.ts`).
- Produces: `CardDeck(props: { plan: DeckPlan; slots: Partial<Record<CardType, JSX.Element>> }): JSX.Element` — renders each card's slot in deck order, skipping any card whose slot is absent (unknown types can never render).

- [ ] **Step 1: Implement `src/components/CardDeck.tsx`**

```tsx
import { View } from "react-native";
import type { DeckPlan, CardType } from "../ui/deck";
import { spacing } from "../theme/tokens";

/** Render a DeckPlan in order. A card with no matching slot is silently skipped,
 *  so an unknown/未 supported card type can never blank the screen. */
export function CardDeck({
  plan, slots,
}: {
  plan: DeckPlan;
  slots: Partial<Record<CardType, JSX.Element>>;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      {plan.cards.map((card, i) => {
        const el = slots[card.type];
        return el ? <View key={`${card.type}-${i}`}>{el}</View> : null;
      })}
    </View>
  );
}
```

Note: remove the stray `未` character from the comment before saving (typo guard).

- [ ] **Step 2: Rewrite `app/index.tsx` to assemble + render the fallback deck**

```tsx
import { Link } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius, subjectColors } from "../src/theme/tokens";
import { computePlan, sessionKeyOf, focusMinutesOn } from "../src/state/model";
import { useStore } from "../src/state/store";
import { daysToNearestExam } from "../src/lib/buildWeek";
import { fmtHours, weekdayShort, fmtTime } from "../src/lib/format";
import { buildFallbackDeck } from "../src/ui/deck";
import { CardDeck } from "../src/components/CardDeck";
import { OrbitRow } from "../src/components/OrbitRow";
import { Ridge } from "../src/components/Ridge";
import { CoachCard } from "../src/components/CoachCard";
import { Garden } from "../src/components/Garden";

const shiftISO = (iso: string, d: number) => {
  const x = new Date(iso + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

export default function Home() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";

  const subjects = state.config.subjects;
  const nameById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects]);
  const plan = useMemo(() => computePlan(state), [state]);

  const orbitSubjects = useMemo(() =>
    subjects
      .map((s) => ({
        id: s.id, name: s.name,
        color: subjectColors[s.name] ?? colors.accent,
        daysToExam: daysToNearestExam(s.id, todayISO),
        coverage: undefined as number | undefined, // real coverage arrives in SP3
      }))
      .sort((a, b) => (a.daysToExam ?? 1e9) - (b.daysToExam ?? 1e9)),
    [subjects, todayISO, colors.accent]);
  const leadId = orbitSubjects[0]?.id;

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftISO(state.week.refDateISO, i)),
    [state.week.refDateISO]);
  const perDay = weekDates.map((d) => focusMinutesOn(state, d));
  const totalMin = perDay.reduce((a, b) => a + b, 0);
  const todayIndex = Math.max(0, weekDates.indexOf(todayISO));

  const today = plan.sessions
    .filter((s) => s.date === todayISO)
    .sort((a, b) => a.interval.start - b.interval.start);
  const next = today.find((s) => state.sessionStatus[sessionKeyOf(s)] !== "done");

  const deck = buildFallbackDeck({
    hasToday: today.length > 0,
    hasSubjects: subjects.length > 0,
    generatedAt: now.toISOString(),
  });

  const coachBody = next
    ? `Next up is ${nameById[next.subjectId]}. Small steps — start the session and I’ll track the rest.`
    : `Nothing scheduled right now. When you finish a session, tell me how it went and I’ll adjust.`;

  const slots = {
    coach_note: <CoachCard body={coachBody} />,
    orbits: <OrbitRow subjects={orbitSubjects} leadId={leadId} />,
    do_next: next ? (
      <Link href="/week" asChild>
        <Pressable style={[styles.doNext, { backgroundColor: colors.accent }]}>
          <View style={{ flex: 1 }}>
            <Text style={[type.caption, { color: "#fff", opacity: 0.85 }]}>DO NEXT</Text>
            <Text style={[type.headline, { color: "#fff", marginTop: 3 }]}>{nameById[next.subjectId]}</Text>
            <Text style={[type.footnote, { color: "#fff", opacity: 0.85 }]}>
              {fmtTime(next.interval.start)}–{fmtTime(next.interval.end)}
            </Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 22 }}>→</Text>
        </Pressable>
      </Link>
    ) : undefined,
    momentum_ridge: (
      <Ridge
        values={perDay}
        labels={weekDates.map((d) => weekdayShort(d)[0]!)}
        todayIndex={todayIndex}
        totalLabel={`${fmtHours(totalMin / 60)} focused`}
        subLabel="this week"
      />
    ),
    garden_peek: <Garden plants={[]} caption="grows as you focus" />,
    reflect_cta: (
      <Link href="/week" asChild>
        <Pressable style={[styles.reflect, { borderColor: colors.separator }]}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.accent, fontSize: 17 }}>🎙</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.callout, { color: colors.text, fontWeight: "700" }]}>Reflect on a session</Text>
            <Text style={[type.footnote, { color: colors.textDim }]}>Just talk — I’ll sort out what you covered.</Text>
          </View>
        </Pressable>
      </Link>
    ),
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.strip}>
          <Text style={[type.headline, { color: colors.text }]}>Reflow</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
              <Text style={[type.footnote, { color: colors.gold }]}>🔥 {state.progress.streakDays}</Text>
            </View>
            <Link href="/rewards" asChild>
              <Pressable>
                <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
                  <Text style={[type.footnote, { color: colors.gold, fontVariant: ["tabular-nums"] }]}>🪙 {state.progress.coins}</Text>
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.lg }]}>
          {weekdayShort(todayISO)} · {now.getDate()}
        </Text>
        <Text style={[type.hero, { color: colors.text, marginTop: spacing.xs, marginBottom: spacing.lg }]}>{greeting}</Text>

        <CardDeck plan={deck} slots={slots} />

        <Link href="/setup" asChild>
          <Pressable><Text style={[type.footnote, { color: colors.textFaint, textAlign: "center", marginTop: spacing.xl }]}>Practice · Corrections · Library · Settings →</Text></Pressable>
        </Link>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 0 },
  strip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  doNext: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  reflect: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed" },
});
```

- [ ] **Step 3: Typecheck + full test suite**

Run: `npm run typecheck && npm test`
Expected: `tsc` clean; all tests (engine/state/tokens/geometry/deck) PASS.

- [ ] **Step 4: Build the web bundle for visual verification**

Run: `cd ~/reflow && npx expo export -p web`
Expected: exits 0, writes `dist/`. If it errors on `react-native-svg` web support, confirm `react-native-svg` installed (Task 1) — it ships a web build; no extra config needed.

- [ ] **Step 5: Serve and screenshot both themes locally**

Run (background server):
```bash
python3 -m http.server 8091 --directory ~/reflow/dist &
```
Then drive the bundled Chromium/Playwright against `http://localhost:8091` and capture the Home screen. Verify against the mockup checklist:
- Orbit rings render (3 subjects), nearest-exam orbit shows the accent border/lead tick.
- Countdown number sits centred in each ring; "not started" caption shows (coverage is SP3).
- Coach card with left accent rule and ✎ avatar at top.
- Momentum ridge draws a smooth curve with the today marker; day initials underneath.
- Garden card shows the empty-state invitation ("Your garden grows as you focus.").
- Reflect dashed card with 🎙.
- Light theme = kraft/burnt-orange; toggling OS dark = charcoal/violet (both legible).

Kill the server when done: `kill %1` (or `pkill -f "http.server 8091"`).

- [ ] **Step 6: Commit**

```bash
git add src/components/CardDeck.tsx app/index.tsx
git commit -m "feat(sp1): CardDeck renderer + Home re-skinned as tutor fallback deck"
```

---

## Self-Review (author checklist — completed)

**Spec coverage (SP1 scope):**
- Orbit identity tokens (light+dark, system-adaptive, SF type) → Task 1. ✅
- `<Surface>` reused (unchanged; glass swap stays SDK-56 deferred). ✅
- `OrbitRing` (signature: fill=coverage, marker=days, centre=countdown) → Tasks 2+4. ✅
- `Ridge`, `CoachCard`, `CardDeck` with fallback deck, garden glyphs → Tasks 3+5+6. ✅
- Home renders a *static fallback deck bound to live data* (tutor `plan_deck` is SP4) → Task 6. ✅
- Coverage shown countdown-only until real data exists (honest; SP2/SP3 fill it) → OrbitRing `coverage?` undefined path. ✅

**Placeholder scan:** two intentional typo-guards flagged inline (empty `<Text/>` loop in Ridge Step 1→removed Step 2; stray `未` in CardDeck comment→removed Step 1). No "TBD/handle edge cases" left. ✅

**Type consistency:** `ringMetrics`/`examMarkerAngleDeg`/`pointOnCircle`/`ridgePath` signatures match across Tasks 2/4/5; `DeckPlan`/`CardType`/`buildFallbackDeck`/`sanitizeDeck` match across Tasks 3/6; `CardDeck` slot map keyed by `CardType`. ✅

**Out of SP1 (correctly deferred):** `plan_deck` LLM call (SP4), real coverage/topic state (SP3), voice reflect wiring (SP3), garden growth mechanic (SP6), killing seeded mock progress numbers (SP2). The 🔥/🪙 pills still read `state.progress` here; SP2 makes those honest.
