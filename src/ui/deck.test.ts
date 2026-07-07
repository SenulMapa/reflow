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
