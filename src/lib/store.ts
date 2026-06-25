/**
 * Global UI store for the Calisthenics Tracker.
 * - Active view tab
 * - Quick actions (open new-workout from anywhere)
 * - Repeat-workout trigger (signals NewWorkoutView to load a prefill)
 */
import { create } from "zustand";
import type { WorkoutFull } from "@/lib/types";

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

  /// ID of a workout to prefill the draft with (Repeat feature).
  /// NewWorkoutView consumes this on mount via the draft store.
  repeatWorkoutId: string | null;
  repeatWorkout: (w: WorkoutFull) => void;
  consumeRepeat: () => string | null;
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),
  goNewWorkout: () => set({ view: "new-workout" }),

  repeatWorkoutId: null,
  repeatWorkout: (w) =>
    set({ repeatWorkoutId: w.id, view: "new-workout" }),
  consumeRepeat: () => {
    const id = useAppStore.getState().repeatWorkoutId;
    if (id) set({ repeatWorkoutId: null });
    return id;
  },
}));
