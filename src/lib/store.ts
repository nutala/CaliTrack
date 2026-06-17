/**
 * Global UI store for the Calisthenics Tracker.
 * - Active view tab
 * - Quick actions (open new-workout from anywhere)
 */
import { create } from "zustand";

export type ViewId =
  | "dashboard"
  | "exercises"
  | "new-workout"
  | "history"
  | "stats";

interface AppState {
  view: ViewId;
  setView: (v: ViewId) => void;
  /// When the user clicks "Log workout" from elsewhere, jump to new-workout
  goNewWorkout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),
  goNewWorkout: () => set({ view: "new-workout" }),
}));
