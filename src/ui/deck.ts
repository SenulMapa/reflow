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
