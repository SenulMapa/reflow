import { describe, expect, test } from "vitest";
import { initialState, addAnnotation, removeAnnotation, annotationsFor, type Annotation } from "./model";

const note = (id: string, sourceId: string, page: number): Annotation => ({
  id, sourceId, page, kind: "note", data: `note ${id}`, color: "#000", createdAt: "2026-07-11T00:00:00Z",
});

describe("textbook annotations", () => {
  test("annotations are scoped to a source + page", () => {
    let s = initialState("2026-07-11");
    s = addAnnotation(s, note("1", "bookA", 1));
    s = addAnnotation(s, note("2", "bookA", 1));
    s = addAnnotation(s, note("3", "bookA", 2));
    s = addAnnotation(s, note("4", "bookB", 1));
    expect(annotationsFor(s, "bookA", 1)).toHaveLength(2);
    expect(annotationsFor(s, "bookA", 2)).toHaveLength(1);
    expect(annotationsFor(s, "bookB", 1)).toHaveLength(1);
    expect(annotationsFor(s, "bookA", 99)).toHaveLength(0);
  });

  test("removeAnnotation drops only the target", () => {
    let s = initialState("2026-07-11");
    s = addAnnotation(s, note("1", "bookA", 1));
    s = addAnnotation(s, note("2", "bookA", 1));
    s = removeAnnotation(s, "1");
    expect(s.annotations).toHaveLength(1);
    expect(s.annotations[0]!.id).toBe("2");
  });
});
