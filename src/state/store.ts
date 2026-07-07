import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Interval } from "../engine/types";
import type { StudySubject } from "../data/subjects";
import * as M from "./model";
import type { ReflowState } from "./model";

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
  addBlock: (date: string, block: Interval) => void;
  removeBlock: (date: string, index: number) => void;
  clearBlocks: () => void;
  setRefDate: (iso: string) => void;
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
      addBlock: (date, b) => set(apply((s) => M.addBlock(s, date, b))),
      removeBlock: (date, i) => set(apply((s) => M.removeBlock(s, date, i))),
      clearBlocks: () => set(apply((s) => M.clearBlocks(s))),
      setRefDate: (iso) => set(apply((s) => M.setRefDate(s, iso))),
      reset: () => set({ state: M.initialState(currentWeekStart()) }),
    }),
    {
      name: "reflow-state-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ state: s.state }),
      onRehydrateStorage: () => (persisted, error) => {
        if (!error) useStore.setState({ hydrated: true });
      },
    }
  )
);
