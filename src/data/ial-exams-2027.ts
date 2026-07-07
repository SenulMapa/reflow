/**
 * Edexcel International AS Level timetable — May/June 2027 series.
 * Exams are PER UNIT, so a subject has several on different dates; the Allocator
 * uses each subject's NEAREST upcoming unit exam as its `daysToExam` signal.
 *
 * Psychology unit codes (WPS01/WPS02) are the standard Edexcel IAL codes —
 * verify against the official entry codes when wiring the real timetable.
 * Computer Science is Cambridge 9618 (separate board/timetable) — TBD here.
 */

export type ExamSession = "morning" | "afternoon";

export interface ExamUnit {
  subject: "Mathematics" | "Physics" | "Psychology";
  unitCode: string;
  title: string;
  /** ISO date (local exam day). */
  date: string;
  session: ExamSession;
}

export const IAL_EXAMS_2027: ExamUnit[] = [
  { subject: "Psychology", unitCode: "WPS01", title: "Unit 1: Social and Cognitive", date: "2027-05-04", session: "morning" },
  { subject: "Mathematics", unitCode: "WMA11", title: "Pure Mathematics 1", date: "2027-05-06", session: "afternoon" },
  { subject: "Physics", unitCode: "WPH11", title: "Unit 1: Mechanics and Materials", date: "2027-05-07", session: "morning" },
  { subject: "Mathematics", unitCode: "WMA12", title: "Pure Mathematics 2", date: "2027-05-11", session: "afternoon" },
  { subject: "Physics", unitCode: "WPH12", title: "Unit 2: Waves and Electricity", date: "2027-05-12", session: "afternoon" },
  { subject: "Mathematics", unitCode: "WME01", title: "Mechanics 1", date: "2027-05-13", session: "afternoon" },
  { subject: "Psychology", unitCode: "WPS02", title: "Unit 2: Biological and Learning", date: "2027-05-14", session: "morning" },
  { subject: "Physics", unitCode: "WPH13", title: "Unit 3: Practical Skills I", date: "2027-05-19", session: "afternoon" },
];
