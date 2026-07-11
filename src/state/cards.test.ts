import { describe, expect, test } from "vitest";
import { initialState, addCard, reviewCard, removeCard, dueCards, dueCountForSubject, type Card } from "./model";
import { newCardState } from "../engine/sm2";

const mkCard = (id: string, subjectId: string, today: string): Card => ({
  id, subjectId, type: "basic", front: `q${id}`, back: `a${id}`, createdAt: today, sm2: newCardState(today),
});

describe("flashcard state", () => {
  const today = "2026-07-11";
  const base = () => initialState(today);

  test("a new card is due immediately and counts for its subject", () => {
    let s = base();
    s = addCard(s, mkCard("1", "math", today));
    expect(dueCards(s, today)).toHaveLength(1);
    expect(dueCountForSubject(s, "math", today)).toBe(1);
    expect(dueCountForSubject(s, "phys", today)).toBe(0);
  });

  test("reviewing a card as Good pushes it out of the due queue", () => {
    let s = base();
    s = addCard(s, mkCard("1", "math", today));
    s = reviewCard(s, "1", 4, today);
    expect(dueCards(s, today)).toHaveLength(0);      // now due tomorrow
    expect(dueCards(s, "2026-07-12")).toHaveLength(1); // due again next day
  });

  test("reviewing as Again keeps it due tomorrow, not today", () => {
    let s = base();
    s = addCard(s, mkCard("1", "math", today));
    s = reviewCard(s, "1", 1, today);
    expect(dueCards(s, today)).toHaveLength(0);
    expect(dueCards(s, "2026-07-12")).toHaveLength(1);
  });

  test("due queue is ordered weakest (lowest ease) first", () => {
    let s = base();
    s = addCard(s, mkCard("easy", "math", today));
    s = addCard(s, mkCard("hard", "math", today));
    s = reviewCard(s, "easy", 5, today);      // ease rises
    s = reviewCard(s, "hard", 1, today);      // ease falls
    // advance so both are due again
    const later = "2026-07-20";
    const order = dueCards(s, later).map((c) => c.id);
    expect(order[0]).toBe("hard");
  });

  test("removeCard drops it", () => {
    let s = base();
    s = addCard(s, mkCard("1", "math", today));
    s = removeCard(s, "1");
    expect(s.cards).toHaveLength(0);
  });
});
