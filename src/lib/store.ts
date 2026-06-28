import { create } from "zustand";
import type { WorkoutFull } from "@/lib/types";

export type ViewId =
  | "dashboard"
  | "exercises"
  | "new-workout"
  | "history"
  | "stats"
  | "profile"
  | "exercise-detail";

interface AppState {
  view: ViewId;
  setView: (v: ViewId) => void;
  goNewWorkout: () => void;

  repeatWorkoutId: string | null;
  repeatWorkout: (w: WorkoutFull) => void;
  consumeRepeat: () => string | null;

  exerciseDetailId: string | null;
  viewExerciseDetail: (id: string) => void;
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

  exerciseDetailId: null,
  viewExerciseDetail: (id) =>
    set({ exerciseDetailId: id, view: "exercise-detail" }),
}));
