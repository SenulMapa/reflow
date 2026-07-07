/** A topic within a subject, with its own self-rated confidence (1..10). */
export interface Topic {
  id: string;
  name: string;
  confidence: number;
}

/** Study subjects. `confidence` is the fallback when a subject has no topics. */
export interface StudySubject {
  id: string;
  name: string;
  confidence: number;
  topics?: Topic[];
}

/**
 * A subject's effective confidence = mean of its topic confidences (the weakness
 * loop), or its own `confidence` when no topics are defined yet. This is what the
 * Allocator reads — so logging a correction that lowers a topic shifts hours.
 */
export function effectiveConfidence(s: StudySubject): number {
  if (s.topics && s.topics.length > 0) {
    return s.topics.reduce((t, x) => t + x.confidence, 0) / s.topics.length;
  }
  return s.confidence;
}

const t = (id: string, name: string, confidence: number): Topic => ({ id, name, confidence });

/** Demo seed — the three Edexcel IAL subjects, each with unit-level topics. */
export const DEMO_SUBJECTS: StudySubject[] = [
  {
    id: "math",
    name: "Mathematics",
    confidence: 4,
    topics: [t("p1", "Pure 1", 5), t("p2", "Pure 2", 4), t("m1", "Mechanics 1", 3)],
  },
  {
    id: "physics",
    name: "Physics",
    confidence: 6,
    topics: [t("mech", "Mechanics & Materials", 6), t("waves", "Waves & Electricity", 6), t("prac", "Practical Skills", 7)],
  },
  {
    id: "psych",
    name: "Psychology",
    confidence: 7,
    topics: [t("social", "Social", 8), t("cog", "Cognitive", 7), t("bio", "Biological & Learning", 6)],
  },
];

/** Maps a subject id to the `subject` field used in the exam timetable. */
export const EXAM_SUBJECT: Record<string, string> = {
  math: "Mathematics",
  physics: "Physics",
  psych: "Psychology",
};
