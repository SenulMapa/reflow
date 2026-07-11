import type { Interval } from "../engine/types";
import { planWeek, type WeekPlan } from "../engine/week";
import {
  buildWeekInput,
  daysToNearestExam,
  DEFAULT_AVAILABILITY,
  type AvailabilityTemplate,
} from "../lib/buildWeek";
import { DEMO_SUBJECTS, type StudySubject, type Topic } from "../data/subjects";
import { EARN, levelForXp, type Progress, type RewardItem } from "./rewards";
import { DEFAULT_POMODORO, type PomodoroConfig } from "../lib/pomodoro";
import { nudgeConfidence } from "../lib/signals";
import { review as sm2Review, type Sm2State } from "../engine/sm2";
import { reflowRemaining } from "../lib/selfHeal";
import type { DeckPlan } from "../ui/deck";

/**
 * Pure app state + reducers. No React, no storage, no I/O — so the whole state
 * layer is unit-testable and the same logic runs under any UI/persistence shell.
 */
export interface ReflowConfig {
  subjects: StudySubject[];
  availability: AvailabilityTemplate; // per weekday (0=Sun..6=Sat)
  commitments: AvailabilityTemplate; // per weekday: fixed classes/labs
  weeklyGoalHours: number;
  slotMinutes: number;
  examWindowDays: number;
  /** Focus-timer durations (editable by the student). */
  pomodoro: PomodoroConfig;
}

export interface WeekState {
  refDateISO: string;
  /** One-off blocks keyed by exact date (YYYY-MM-DD). */
  blocks: Record<string, Interval[]>;
  /** When set, the plan self-heals: remaining goal re-fits from this date onward. */
  reflowedFromISO?: string;
}

/** A Correction Booklet entry — a logged mistake + its fix, tied to a topic. */
export interface Correction {
  id: string;
  subjectId: string;
  topicId?: string;
  mistake: string;
  fix: string;
  date: string;
  reviewed: boolean;
}

/** A logged past-paper attempt — feeds the allocator's performance signal. */
export interface PastPaper {
  id: string;
  subjectId: string;
  year: number;
  month: string; // e.g. "May", "Jan"
  variant: string; // e.g. "WMA11/01"
  scorePct: number | null; // 0..100
  weakChapters: string[];
  date: string;
}

/** A completed focus/pomodoro session — owned metrics that feed insights. */
export interface FocusSession {
  id: string;
  subjectId?: string;
  date: string;
  minutes: number;
}

/** A plant earned by completing a focus session — the garden reward. */
export interface Plant {
  id: string;
  kind: string; // emoji glyph
  subjectId?: string;
  date: string;
}

/** Kinds cycle for variety as the garden fills. */
export const GARDEN_KINDS = ["🌱", "🌿", "🌷", "🌻", "🪴", "🌵", "🌳", "🌴", "🍀", "🌸"];

/** A post-session reflection: the student says what happened, the tutor cleans it up. */
export interface Reflection {
  id: string;
  sessionId?: string;
  subjectId?: string;
  minutes?: number;
  date: string;
  raw: string; // what the student said/typed
  summary?: string; // tutor's cleaned-up version (optional)
}

/** A knowledge-base source added in-app (PDF, YouTube, or link). */
export interface Source {
  id: string;
  type: "pdf" | "youtube" | "link";
  title: string;
  uri: string;
  subjectId?: string;
  addedDate: string;
  /** True once the box's RAG pipeline has ingested it (false = pending). */
  ingested: boolean;
}

/** Classify a URL/URI into a source type. */
export function classifySource(uri: string): Source["type"] {
  if (/youtube\.com|youtu\.be/i.test(uri)) return "youtube";
  if (/\.pdf($|\?)/i.test(uri) || uri.startsWith("file:")) return "pdf";
  return "link";
}

/** A spaced-repetition flashcard (SM-2 scheduled). */
export interface Card {
  id: string;
  subjectId: string;
  topicId?: string;
  /** basic front/back, cloze deletion, or a formula card. */
  type: "basic" | "cloze" | "formula";
  front: string;
  back: string;
  /** KB source it was generated/extracted from, if any. */
  sourceId?: string;
  createdAt: string;
  sm2: Sm2State;
}

/**
 * A pen/annotation over a KB PDF source (textbook reader). `data` is a serialized
 * payload whose shape depends on `kind`: ink = stroke points (+pressure), highlight
 * = a rect, note = anchored text. Local-first — ink never leaves the device.
 */
export interface Annotation {
  id: string;
  sourceId: string;
  page: number;
  kind: "ink" | "highlight" | "note";
  data: string;
  color: string;
  createdAt: string;
}

/** A single message in the tutor chat thread. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
};

/** A named tutor conversation — the unit of chat history (Grok/Tani-style drawer). */
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface ReflowState {
  config: ReflowConfig;
  week: WeekState;
  corrections: Correction[];
  pastPapers: PastPaper[];
  focusSessions: FocusSession[];
  sources: Source[];
  /** Per-session completion, keyed by sessionKeyOf(). */
  sessionStatus: Record<string, "done" | "skipped">;
  progress: Progress;
  /** Cached tutor-arranged dashboard deck (null until first planned). */
  deck?: DeckPlan | null;
  /** Tutor chat thread (legacy single thread — superseded by `conversations`). */
  chat: ChatMessage[];
  /** Tutor conversation history, most-recently-used first. */
  conversations: Conversation[];
  /** The open conversation, or null for a fresh (not-yet-saved) chat. */
  activeConversationId: string | null;
  /** The focus garden — one plant per completed focus session. */
  garden: Plant[];
  /** Post-session reflections (the tutor's memory of how sessions went). */
  reflections: Reflection[];
  /** Spaced-repetition flashcards (SM-2 scheduled). */
  cards: Card[];
  /** Pen/highlight/note annotations over KB PDF sources (textbook reader). */
  annotations: Annotation[];
}

export function initialState(refDateISO: string): ReflowState {
  return {
    config: {
      subjects: DEMO_SUBJECTS.map((s) => ({ ...s, topics: s.topics?.map((t) => ({ ...t })) })),
      availability: DEFAULT_AVAILABILITY,
      commitments: {},
      weeklyGoalHours: 24,
      slotMinutes: 30,
      examWindowDays: 14,
      pomodoro: DEFAULT_POMODORO,
    },
    week: { refDateISO, blocks: {} },
    corrections: [],
    pastPapers: [],
    focusSessions: [],
    sources: [],
    sessionStatus: {},
    deck: null,
    chat: [],
    conversations: [],
    activeConversationId: null,
    garden: [],
    reflections: [],
    cards: [],
    annotations: [],
    progress: {
      // Honest start — everything is earned, nothing is seeded.
      coins: 0,
      xp: 0,
      streakDays: 0,
      lastStudyDate: null,
      rewards: [
        { id: "yt", label: "30 min YouTube", cost: 60, icon: "📺" },
        { id: "game", label: "1 hour gaming", cost: 120, icon: "🎮" },
        { id: "film", label: "Film night", cost: 300, icon: "🎬" },
      ],
      ledger: [],
    },
  };
}

// ── Reducers (pure: return a new state) ─────────────────────────────────────

const withConfig = (s: ReflowState, patch: Partial<ReflowConfig>): ReflowState => ({
  ...s,
  config: { ...s.config, ...patch },
});

export const setWeeklyGoal = (s: ReflowState, hours: number): ReflowState =>
  withConfig(s, { weeklyGoalHours: Math.max(0, hours) });

export const setSlotMinutes = (s: ReflowState, slotMinutes: number): ReflowState =>
  withConfig(s, { slotMinutes });

export const setPomodoro = (s: ReflowState, pomodoro: PomodoroConfig): ReflowState =>
  withConfig(s, { pomodoro });

/** Add a plant to the garden (one per completed focus session); kind cycles. */
export function addPlant(s: ReflowState, subjectId: string | undefined, date: string): ReflowState {
  const kind = GARDEN_KINDS[s.garden.length % GARDEN_KINDS.length]!;
  return { ...s, garden: [...s.garden, { id: `${s.garden.length + 1}-${date}`, kind, subjectId, date }] };
}

/** Append a post-session reflection (newest first). */
export function addReflection(s: ReflowState, r: Reflection): ReflowState {
  return { ...s, reflections: [r, ...s.reflections] };
}

export function addSubject(s: ReflowState, subject: StudySubject): ReflowState {
  if (s.config.subjects.some((x) => x.id === subject.id)) return s;
  return withConfig(s, { subjects: [...s.config.subjects, subject] });
}

export const removeSubject = (s: ReflowState, id: string): ReflowState =>
  withConfig(s, { subjects: s.config.subjects.filter((x) => x.id !== id) });

export const setConfidence = (s: ReflowState, id: string, confidence: number): ReflowState =>
  withConfig(s, {
    subjects: s.config.subjects.map((x) =>
      x.id === id ? { ...x, confidence: clamp(confidence, 1, 10) } : x
    ),
  });

export const setAvailability = (
  s: ReflowState,
  weekday: number,
  windows: Interval[]
): ReflowState =>
  withConfig(s, { availability: { ...s.config.availability, [weekday]: windows } });

export function addBlock(s: ReflowState, date: string, block: Interval): ReflowState {
  const existing = s.week.blocks[date] ?? [];
  return {
    ...s,
    week: { ...s.week, blocks: { ...s.week.blocks, [date]: [...existing, block] } },
  };
}

export function removeBlock(s: ReflowState, date: string, index: number): ReflowState {
  const existing = s.week.blocks[date] ?? [];
  const next = existing.filter((_, i) => i !== index);
  const blocks = { ...s.week.blocks };
  if (next.length) blocks[date] = next;
  else delete blocks[date];
  return { ...s, week: { ...s.week, blocks } };
}

export const clearBlocks = (s: ReflowState): ReflowState => ({
  ...s,
  week: { ...s.week, blocks: {} },
});

export const setRefDate = (s: ReflowState, refDateISO: string): ReflowState => ({
  ...s,
  week: { ...s.week, refDateISO },
});

// ── Topics + Correction Booklet (the weakness loop) ─────────────────────────

export function addTopic(s: ReflowState, subjectId: string, topic: Topic): ReflowState {
  return withConfig(s, {
    subjects: s.config.subjects.map((subj) =>
      subj.id === subjectId ? { ...subj, topics: [...(subj.topics ?? []), topic] } : subj
    ),
  });
}

export function setTopicConfidence(
  s: ReflowState,
  subjectId: string,
  topicId: string,
  confidence: number
): ReflowState {
  return withConfig(s, {
    subjects: s.config.subjects.map((subj) =>
      subj.id === subjectId
        ? {
            ...subj,
            topics: subj.topics?.map((t) =>
              t.id === topicId ? { ...t, confidence: clamp(confidence, 1, 10) } : t
            ),
          }
        : subj
    ),
  });
}

function topicConfidence(s: ReflowState, subjectId: string, topicId: string): number | undefined {
  return s.config.subjects
    .find((x) => x.id === subjectId)
    ?.topics?.find((t) => t.id === topicId)?.confidence;
}

/**
 * The auto signal loop: a Feynman self-explanation grade (0..10) nudges the
 * topic's confidence toward it (gentle EMA), so practising updates the model
 * that drives the allocator + readiness — no manual confidence tweaking.
 */
export function applyFeynmanConfidence(
  s: ReflowState,
  subjectId: string,
  topicId: string,
  score10: number
): ReflowState {
  const cur = topicConfidence(s, subjectId, topicId) ?? 5;
  return setTopicConfidence(s, subjectId, topicId, nudgeConfidence(cur, score10));
}

/** Log a correction; if tied to a topic, drop that topic's confidence by 1. */
export function addCorrection(s: ReflowState, correction: Correction): ReflowState {
  const lowered = correction.topicId
    ? setTopicConfidence(
        s,
        correction.subjectId,
        correction.topicId,
        (topicConfidence(s, correction.subjectId, correction.topicId) ?? 5) - 1
      )
    : s;
  return { ...lowered, corrections: [correction, ...lowered.corrections] };
}

export const toggleCorrectionReviewed = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  corrections: s.corrections.map((c) => (c.id === id ? { ...c, reviewed: !c.reviewed } : c)),
});

export const removeCorrection = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  corrections: s.corrections.filter((c) => c.id !== id),
});

// ── Past papers → performance signal (the macro half of the loop) ───────────

export function addPastPaper(s: ReflowState, paper: PastPaper): ReflowState {
  return { ...s, pastPapers: [paper, ...s.pastPapers] };
}

export const removePastPaper = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  pastPapers: s.pastPapers.filter((p) => p.id !== id),
});

/** Performance 0..1 for a subject = mean of its recent scored papers, or null. */
export function subjectPerformance(s: ReflowState, subjectId: string, recent = 5): number | null {
  const scored = s.pastPapers
    .filter((p) => p.subjectId === subjectId && p.scorePct != null)
    .slice(0, recent);
  if (!scored.length) return null;
  return scored.reduce((t, p) => t + (p.scorePct ?? 0), 0) / scored.length / 100;
}

export function performanceMap(s: ReflowState): Record<string, number | null> {
  return Object.fromEntries(
    s.config.subjects.map((subj) => [subj.id, subjectPerformance(s, subj.id)])
  );
}

// ── Focus sessions (Phase 4) ────────────────────────────────────────────────

export function addFocusSession(s: ReflowState, session: FocusSession): ReflowState {
  return { ...s, focusSessions: [session, ...s.focusSessions] };
}

/** Total focused minutes logged for a given ISO date. */
export function focusMinutesOn(s: ReflowState, date: string): number {
  return s.focusSessions.filter((f) => f.date === date).reduce((t, f) => t + f.minutes, 0);
}

// ── Knowledge-base sources (Phase 5 / KB) ───────────────────────────────────

export function addSource(s: ReflowState, source: Source): ReflowState {
  return { ...s, sources: [source, ...s.sources] };
}

export const removeSource = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  sources: s.sources.filter((x) => x.id !== id),
});

// ── Spaced-repetition flashcards (SM-2, Fable feature 1.1) ───────────────────

export const addCard = (s: ReflowState, card: Card): ReflowState => ({
  ...s,
  cards: [card, ...s.cards],
});

export const removeCard = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  cards: s.cards.filter((c) => c.id !== id),
});

/** Grade one card (quality 0–5) on `todayISO`; reschedules it via SM-2. */
export function reviewCard(s: ReflowState, id: string, quality: number, todayISO: string): ReflowState {
  return {
    ...s,
    cards: s.cards.map((c) => (c.id === id ? { ...c, sm2: sm2Review(c.sm2, quality, todayISO) } : c)),
  };
}

/** All cards due for review on/before `todayISO`, weakest (lowest ease) first. */
export function dueCards(s: ReflowState, todayISO: string): Card[] {
  return s.cards
    .filter((c) => c.sm2.dueAt <= todayISO)
    .sort((a, b) => a.sm2.easeFactor - b.sm2.easeFactor);
}

/** Count of due cards for a subject — an allocator signal (feature 2.1). */
export function dueCountForSubject(s: ReflowState, subjectId: string, todayISO: string): number {
  return s.cards.filter((c) => c.subjectId === subjectId && c.sm2.dueAt <= todayISO).length;
}

// ── Textbook annotations (pen/highlight/note over KB PDF sources) ────────────

export const addAnnotation = (s: ReflowState, a: Annotation): ReflowState => ({
  ...s,
  annotations: [...s.annotations, a],
});

export const removeAnnotation = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  annotations: s.annotations.filter((a) => a.id !== id),
});

/** All annotations for a given source page, in creation order. */
export function annotationsFor(s: ReflowState, sourceId: string, page: number): Annotation[] {
  return s.annotations.filter((a) => a.sourceId === sourceId && a.page === page);
}

// ── Session missions + completion (Fable #1, #2) ────────────────────────────

/** Stable identity for a placed session (date + subject + start minute). */
export function sessionKeyOf(s: { date: string; subjectId: string; interval: { start: number } }): string {
  return `${s.date}|${s.subjectId}|${s.interval.start}`;
}

/** The lowest-confidence topic of a subject — what a session should target. */
export function weakestTopic(s: ReflowState, subjectId: string): Topic | undefined {
  const subj = s.config.subjects.find((x) => x.id === subjectId);
  if (!subj?.topics?.length) return undefined;
  return [...subj.topics].sort((a, b) => a.confidence - b.confidence)[0];
}

/** Count of un-reviewed corrections for a subject (optionally a topic). */
export function unreviewedCorrections(s: ReflowState, subjectId: string, topicId?: string): number {
  return s.corrections.filter(
    (c) => c.subjectId === subjectId && (!topicId || c.topicId === topicId) && !c.reviewed
  ).length;
}

export function setSessionStatus(
  s: ReflowState,
  key: string,
  status: "done" | "skipped" | null
): ReflowState {
  const next = { ...s.sessionStatus };
  if (status === null) delete next[key];
  else next[key] = status;
  return { ...s, sessionStatus: next };
}

// ── Tutor deck + chat (v2) ──────────────────────────────────────────────────

export const setDeck = (s: ReflowState, deck: DeckPlan | null): ReflowState => ({
  ...s,
  deck,
});

export const appendChat = (s: ReflowState, msg: ChatMessage): ReflowState => ({
  ...s,
  chat: [...s.chat, msg],
});

export const clearChat = (s: ReflowState): ReflowState => ({
  ...s,
  chat: [],
});

// ── Tutor conversation history (Grok/Tani-style drawer) ─────────────────────

const conversationTitle = (text: string): string => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t || "New chat";
};

/**
 * Append a message to the active conversation, creating one (titled from the
 * message) when none is active. The touched conversation floats to the top of
 * the MRU list so the drawer reads newest-first.
 */
export function appendMessage(s: ReflowState, msg: ChatMessage): ReflowState {
  const active = s.conversations.find((c) => c.id === s.activeConversationId);
  if (!active) {
    const id = `conv_${msg.id}`;
    const conv: Conversation = {
      id,
      title: conversationTitle(msg.role === "user" ? msg.content : "New chat"),
      messages: [msg],
      updatedAt: msg.at,
    };
    return { ...s, conversations: [conv, ...s.conversations], activeConversationId: id };
  }
  const updated: Conversation = { ...active, messages: [...active.messages, msg], updatedAt: msg.at };
  return {
    ...s,
    conversations: [updated, ...s.conversations.filter((c) => c.id !== active.id)],
  };
}

/** Begin a fresh chat — the next message opens a new conversation. */
export const startNewConversation = (s: ReflowState): ReflowState => ({
  ...s,
  activeConversationId: null,
});

export const selectConversation = (s: ReflowState, id: string): ReflowState => ({
  ...s,
  activeConversationId: id,
});

export const renameConversation = (s: ReflowState, id: string, title: string): ReflowState => ({
  ...s,
  conversations: s.conversations.map((c) =>
    c.id === id ? { ...c, title: title.trim() || c.title } : c
  ),
});

export function deleteConversation(s: ReflowState, id: string): ReflowState {
  return {
    ...s,
    conversations: s.conversations.filter((c) => c.id !== id),
    activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
  };
}

/** Messages of the open conversation (empty for a fresh chat). */
export const activeMessages = (s: ReflowState): ChatMessage[] =>
  s.conversations.find((c) => c.id === s.activeConversationId)?.messages ?? [];

/** The drawer list — {id, title}, most-recently-used first. */
export const conversationList = (s: ReflowState): { id: string; title: string }[] =>
  s.conversations.map((c) => ({ id: c.id, title: c.title }));

// ── Reward economy (earn by studying, spend on leisure) ─────────────────────

const shiftDate = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function award(s: ReflowState, coins: number, xp: number, reason: string, date: string): ReflowState {
  const p = s.progress;
  const entry = { id: `${date}-${p.ledger.length}`, kind: "earn" as const, amount: coins, reason, date };
  return { ...s, progress: { ...p, coins: p.coins + coins, xp: p.xp + xp, ledger: [entry, ...p.ledger].slice(0, 60) } };
}

/** Count today toward the streak (consecutive study days). Idempotent per day. */
export function touchStreak(s: ReflowState, date: string): ReflowState {
  const p = s.progress;
  if (p.lastStudyDate === date) return s;
  const streakDays = p.lastStudyDate === shiftDate(date, -1) ? p.streakDays + 1 : 1;
  return { ...s, progress: { ...p, streakDays, lastStudyDate: date } };
}

/** Mark a session done (idempotent) → count the streak + award session coins/xp. */
export function markSessionDone(s: ReflowState, key: string, date: string): ReflowState {
  if (s.sessionStatus[key] === "done") return s;
  const withStatus = setSessionStatus(s, key, "done");
  const withStreak = touchStreak(withStatus, date);
  return award(withStreak, EARN.session.coins, EARN.session.xp, "Session complete", date);
}

export function addReward(s: ReflowState, item: RewardItem): ReflowState {
  return { ...s, progress: { ...s.progress, rewards: [...s.progress.rewards, item] } };
}

export function removeReward(s: ReflowState, id: string): ReflowState {
  return { ...s, progress: { ...s.progress, rewards: s.progress.rewards.filter((r) => r.id !== id) } };
}

/** Spend coins on a reward if affordable; unchanged state if not. */
export function redeemReward(s: ReflowState, id: string, date: string): ReflowState {
  const item = s.progress.rewards.find((r) => r.id === id);
  if (!item || s.progress.coins < item.cost) return s;
  const entry = { id: `${date}-spend-${s.progress.ledger.length}`, kind: "spend" as const, amount: item.cost, reason: item.label, date };
  return {
    ...s,
    progress: { ...s.progress, coins: s.progress.coins - item.cost, ledger: [entry, ...s.progress.ledger].slice(0, 60) },
  };
}

// ── Selector ────────────────────────────────────────────────────────────────

export function computePlan(s: ReflowState): WeekPlan {
  const { config, week } = s;
  let input = buildWeekInput({
    refDateISO: week.refDateISO,
    subjects: config.subjects,
    availability: config.availability,
    commitments: config.commitments,
    blocks: week.blocks,
    performance: performanceMap(s),
    weeklyGoalHours: config.weeklyGoalHours,
    slotMinutes: config.slotMinutes,
    examWindowDays: config.examWindowDays,
  });
  // Self-heal: if the student reflowed, re-fit only the remaining goal (minus
  // hours already banked this week) into the days from the reflow date onward.
  if (week.reflowedFromISO) {
    const banked = input.days.reduce((t, d) => t + focusMinutesOn(s, d.date), 0) / 60;
    input = reflowRemaining(input, week.reflowedFromISO, banked);
  }
  return planWeek(input);
}

/** Turn on self-healing from a given day (the plan re-fits remaining hours forward). */
export function reflowWeek(s: ReflowState, fromISO: string): ReflowState {
  return { ...s, week: { ...s.week, reflowedFromISO: fromISO } };
}

/** Undo self-healing — restore the full even-week plan. */
export function clearReflow(s: ReflowState): ReflowState {
  const { reflowedFromISO, ...week } = s.week;
  return { ...s, week };
}

/**
 * A compact, JSON-serialisable snapshot of the student passed to every tutor
 * call (plan_deck, chat). Small on purpose — subjects + exam countdowns, this
 * week's planned minutes per subject, progress, and a couple of activity signals.
 * All dates derive from s.week.refDateISO; never calls Date.now().
 */
export function studentModel(s: ReflowState) {
  const refISO = s.week.refDateISO;

  const subjects = s.config.subjects.map((subj) => ({
    id: subj.id,
    name: subj.name,
    daysToExam: daysToNearestExam(subj.id, refISO),
  }));

  const plan = computePlan(s);
  const plannedMinutes: Record<string, number> = {};
  for (const a of plan.allocations) {
    plannedMinutes[a.subjectId] = Math.round(a.hours * 60);
  }

  // Focus minutes across the 7 days of the week starting at refDateISO.
  let focusMinutesThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    focusMinutesThisWeek += focusMinutesOn(s, shiftDate(refISO, i));
  }

  const corrections = s.corrections.filter((c) => !c.reviewed).length;

  // The tutor's memory: the student's most recent spoken/typed reflections.
  const recentReflections = s.reflections.slice(0, 6).map((r) => ({
    subject: r.subjectId ? (s.config.subjects.find((x) => x.id === r.subjectId)?.name ?? null) : null,
    date: r.date,
    note: r.summary ?? r.raw,
  }));

  return {
    subjects,
    weeklyGoalHours: s.config.weeklyGoalHours,
    plan: { plannedMinutes },
    progress: {
      coins: s.progress.coins,
      streakDays: s.progress.streakDays,
      level: levelForXp(s.progress.xp),
    },
    corrections,
    focusMinutesThisWeek,
    gardenPlants: s.garden.length,
    recentReflections,
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
