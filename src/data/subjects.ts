/** Study subjects with a self-rated confidence (1..10, lower = weaker). */
export interface StudySubject {
  id: string;
  name: string;
  confidence: number;
}

/**
 * Demo seed — the three Edexcel IAL subjects with exams in the 2027 timetable.
 * (Computer Science is Cambridge 9618, a separate timetable — added later.)
 */
export const DEMO_SUBJECTS: StudySubject[] = [
  { id: "math", name: "Mathematics", confidence: 4 },
  { id: "physics", name: "Physics", confidence: 6 },
  { id: "psych", name: "Psychology", confidence: 7 },
];

/** Maps a subject id to the `subject` field used in the exam timetable. */
export const EXAM_SUBJECT: Record<string, string> = {
  math: "Mathematics",
  physics: "Physics",
  psych: "Psychology",
};
