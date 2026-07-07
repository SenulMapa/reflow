import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Interval } from "../engine/types";
import type { StudySubject, Topic } from "../data/subjects";
import * as M from "./model";
import type { Correction, FocusSession, PastPaper, ReflowState, Source } from "./model";

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
  addTopic: (subjectId: string, topic: Topic) => void;
  setTopicConfidence: (subjectId: string, topicId: string, confidence: number) => void;
  addCorrection: (c: Correction) => void;
  toggleCorrectionReviewed: (id: string) => void;
  removeCorrection: (id: string) => void;
  addPastPaper: (p: PastPaper) => void;
  removePastPaper: (id: string) => void;
  addFocusSession: (f: FocusSession) => void;
  addSource: (s: Source) => void;
  removeSource: (id: string) => void;
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
      addTopic: (subjectId, topic) => set(apply((s) => M.addTopic(s, subjectId, topic))),
      setTopicConfidence: (subjectId, topicId, c) =>
        set(apply((s) => M.setTopicConfidence(s, subjectId, topicId, c))),
      addCorrection: (c) => set(apply((s) => M.addCorrection(s, c))),
      toggleCorrectionReviewed: (id) => set(apply((s) => M.toggleCorrectionReviewed(s, id))),
      removeCorrection: (id) => set(apply((s) => M.removeCorrection(s, id))),
      addPastPaper: (p) => set(apply((s) => M.addPastPaper(s, p))),
      removePastPaper: (id) => set(apply((s) => M.removePastPaper(s, id))),
      addFocusSession: (f) => set(apply((s) => M.addFocusSession(s, f))),
      addSource: (src) => set(apply((s) => M.addSource(s, src))),
      removeSource: (id) => set(apply((s) => M.removeSource(s, id))),
      reset: () => set({ state: M.initialState(currentWeekStart()) }),
    }),
    {
      name: "reflow-state-v5",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ state: s.state }),
      onRehydrateStorage: () => (persisted, error) => {
        if (!error) useStore.setState({ hydrated: true });
      },
    }
  )
);
