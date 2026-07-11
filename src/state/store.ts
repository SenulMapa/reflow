import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Interval } from "../engine/types";
import type { StudySubject, Topic } from "../data/subjects";
import * as M from "./model";
import type { Card, ChatMessage, Correction, FocusSession, PastPaper, Reflection, ReflowState, Source } from "./model";
import type { DeckPlan } from "../ui/deck";
import type { PomodoroConfig } from "../lib/pomodoro";
import type { RewardItem } from "./rewards";

/** Calendar Monday (YYYY-MM-DD) of the current local week. */
export function currentWeekStart(now: Date = new Date()): string {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${monday.getFullYear()}-${p(monday.getMonth() + 1)}-${p(monday.getDate())}`;
}

interface Store {
  state: ReflowState;
  hydrated: boolean;
  setWeeklyGoal: (hours: number) => void;
  setConfidence: (id: string, confidence: number) => void;
  addSubject: (s: StudySubject) => void;
  removeSubject: (id: string) => void;
  setAvailability: (weekday: number, windows: Interval[]) => void;
  addBlock: (date: string, block: Interval) => void;
  removeBlock: (date: string, index: number) => void;
  clearBlocks: () => void;
  setRefDate: (iso: string) => void;
  reflowWeek: (fromISO: string) => void;
  clearReflow: () => void;
  addTopic: (subjectId: string, topic: Topic) => void;
  setTopicConfidence: (subjectId: string, topicId: string, confidence: number) => void;
  applyFeynmanConfidence: (subjectId: string, topicId: string, score10: number) => void;
  addCorrection: (c: Correction) => void;
  toggleCorrectionReviewed: (id: string) => void;
  removeCorrection: (id: string) => void;
  addPastPaper: (p: PastPaper) => void;
  removePastPaper: (id: string) => void;
  addFocusSession: (f: FocusSession) => void;
  addSource: (s: Source) => void;
  removeSource: (id: string) => void;
  setSessionStatus: (key: string, status: "done" | "skipped" | null) => void;
  markSessionDone: (key: string, date: string) => void;
  award: (coins: number, xp: number, reason: string, date: string) => void;
  addReward: (item: RewardItem) => void;
  removeReward: (id: string) => void;
  redeemReward: (id: string, date: string) => void;
  setDeck: (deck: DeckPlan | null) => void;
  appendChat: (msg: ChatMessage) => void;
  clearChat: () => void;
  appendMessage: (msg: ChatMessage) => void;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  setPomodoro: (p: PomodoroConfig) => void;
  addPlant: (subjectId: string | undefined, date: string) => void;
  addReflection: (r: Reflection) => void;
  addCard: (c: Card) => void;
  removeCard: (id: string) => void;
  reviewCard: (id: string, quality: number, todayISO: string) => void;
  reset: () => void;
}

const apply = (fn: (s: ReflowState) => ReflowState) => (store: Store) => ({
  state: fn(store.state),
});

export const useStore = create<Store>()(
  persist(
    (set) => ({
      state: M.initialState(currentWeekStart()),
      hydrated: false,
      setWeeklyGoal: (h) => set(apply((s) => M.setWeeklyGoal(s, h))),
      setConfidence: (id, c) => set(apply((s) => M.setConfidence(s, id, c))),
      addSubject: (subj) => set(apply((s) => M.addSubject(s, subj))),
      removeSubject: (id) => set(apply((s) => M.removeSubject(s, id))),
      setAvailability: (wd, windows) => set(apply((s) => M.setAvailability(s, wd, windows))),
      addBlock: (date, b) => set(apply((s) => M.addBlock(s, date, b))),
      removeBlock: (date, i) => set(apply((s) => M.removeBlock(s, date, i))),
      clearBlocks: () => set(apply((s) => M.clearBlocks(s))),
      setRefDate: (iso) => set(apply((s) => M.setRefDate(s, iso))),
      reflowWeek: (fromISO) => set(apply((s) => M.reflowWeek(s, fromISO))),
      clearReflow: () => set(apply((s) => M.clearReflow(s))),
      addTopic: (subjectId, topic) => set(apply((s) => M.addTopic(s, subjectId, topic))),
      setTopicConfidence: (subjectId, topicId, c) =>
        set(apply((s) => M.setTopicConfidence(s, subjectId, topicId, c))),
      applyFeynmanConfidence: (subjectId, topicId, score10) =>
        set(apply((s) => M.applyFeynmanConfidence(s, subjectId, topicId, score10))),
      addCorrection: (c) => set(apply((s) => M.addCorrection(s, c))),
      toggleCorrectionReviewed: (id) => set(apply((s) => M.toggleCorrectionReviewed(s, id))),
      removeCorrection: (id) => set(apply((s) => M.removeCorrection(s, id))),
      addPastPaper: (p) => set(apply((s) => M.addPastPaper(s, p))),
      removePastPaper: (id) => set(apply((s) => M.removePastPaper(s, id))),
      addFocusSession: (f) => set(apply((s) => M.addFocusSession(s, f))),
      addSource: (src) => set(apply((s) => M.addSource(s, src))),
      removeSource: (id) => set(apply((s) => M.removeSource(s, id))),
      setSessionStatus: (key, status) => set(apply((s) => M.setSessionStatus(s, key, status))),
      markSessionDone: (key, date) => set(apply((s) => M.markSessionDone(s, key, date))),
      award: (coins, xp, reason, date) => set(apply((s) => M.award(s, coins, xp, reason, date))),
      addReward: (item) => set(apply((s) => M.addReward(s, item))),
      removeReward: (id) => set(apply((s) => M.removeReward(s, id))),
      redeemReward: (id, date) => set(apply((s) => M.redeemReward(s, id, date))),
      setDeck: (deck) => set(apply((s) => M.setDeck(s, deck))),
      appendChat: (msg) => set(apply((s) => M.appendChat(s, msg))),
      clearChat: () => set(apply((s) => M.clearChat(s))),
      appendMessage: (msg) => set(apply((s) => M.appendMessage(s, msg))),
      startNewConversation: () => set(apply((s) => M.startNewConversation(s))),
      selectConversation: (id) => set(apply((s) => M.selectConversation(s, id))),
      renameConversation: (id, title) => set(apply((s) => M.renameConversation(s, id, title))),
      deleteConversation: (id) => set(apply((s) => M.deleteConversation(s, id))),
      setPomodoro: (p) => set(apply((s) => M.setPomodoro(s, p))),
      addPlant: (subjectId, date) => set(apply((s) => M.addPlant(s, subjectId, date))),
      addReflection: (r) => set(apply((s) => M.addReflection(s, r))),
      addCard: (c) => set(apply((s) => M.addCard(s, c))),
      removeCard: (id) => set(apply((s) => M.removeCard(s, id))),
      reviewCard: (id, quality, todayISO) => set(apply((s) => M.reviewCard(s, id, quality, todayISO))),
      reset: () => set({ state: M.initialState(currentWeekStart()) }),
    }),
    {
      name: "reflow-state-v11",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ state: s.state }),
      // Deep-merge persisted state OVER a fresh initialState so newly-added slices
      // (e.g. `cards`) backfill to their defaults instead of arriving `undefined`
      // and crashing selectors — preserves existing user data across schema growth.
      merge: (persisted, current) => {
        const p = persisted as { state?: Partial<ReflowState> } | undefined;
        if (!p?.state) return current;
        return { ...current, state: { ...current.state, ...p.state } };
      },
      onRehydrateStorage: () => (persisted, error) => {
        if (!error) useStore.setState({ hydrated: true });
      },
    }
  )
);
