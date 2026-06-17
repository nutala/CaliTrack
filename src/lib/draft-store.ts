/**
 * Global workout-draft store.
 *
 * Holds the in-progress workout so it survives view switches (e.g. checking
 * the dashboard or history mid-session, or repeating a past workout). Also
 * powers the "Repeat workout" feature via `loadFromWorkout`.
 */
import { create } from "zustand";
import { format } from "date-fns";
import type { ExerciseWithVariants, WorkoutFull } from "@/lib/types";

// ---------------------------------------------------------------------------
// Draft types — transient, never persisted to DB
// ---------------------------------------------------------------------------

export type DraftSet = {
  id: string;
  reps?: number;
  holdSeconds?: number;
  weightKg?: number;
  rpe?: number;
  /// User-confirmed completion during the live session (green check).
  validated: boolean;
};

export type DraftEntry = {
  id: string;
  exerciseId: string;
  variantId: string | null;
  notes: string;
  /// Null = standalone; a positive number groups entries into a superset.
  supersetGroup: number | null;
  sets: DraftSet[];
};

export type WorkoutDraft = {
  title: string;
  date: string;
  durationMin: number | "";
  exertion: number;
  bodyweight: number;
  notes: string;
  defaultRestSec: number;
  entries: DraftEntry[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function emptyDraft(): WorkoutDraft {
  return {
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    durationMin: "",
    exertion: 5,
    bodyweight: 72,
    notes: "",
    defaultRestSec: 90,
    entries: [],
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface WorkoutDraftStore extends WorkoutDraft {
  setMeta: <K extends keyof WorkoutDraft>(
    key: K,
    value: WorkoutDraft[K],
  ) => void;

  addEntry: (exercise: ExerciseWithVariants) => void;
  removeEntry: (entryId: string) => void;
  updateEntry: (entryId: string, patch: Partial<DraftEntry>) => void;
  setSuperset: (entryId: string, group: number | null) => void;

  addSet: (entryId: string) => void;
  updateSet: (entryId: string, setId: string, patch: Partial<DraftSet>) => void;
  removeSet: (entryId: string, setId: string) => void;
  validateSet: (entryId: string, setId: string, validated: boolean) => void;

  resetDraft: () => void;

  /// Load draft from a past workout (Repeat feature). Resolves exercise
  /// objects via the provided lookup map.
  loadFromWorkout: (
    workout: WorkoutFull,
    exerciseMap: Map<string, ExerciseWithVariants>,
  ) => void;
}

export const useDraftStore = create<WorkoutDraftStore>((set, get) => ({
  ...emptyDraft(),

  setMeta: (key, value) => set({ [key]: value } as Partial<WorkoutDraft>),

  addEntry: (exercise) =>
    set((s) => ({
      entries: [
        ...s.entries,
        {
          id: uid(),
          exerciseId: exercise.id,
          variantId: null,
          notes: "",
          supersetGroup: null,
          sets: [{ id: uid(), validated: false }],
        },
      ],
    })),

  removeEntry: (entryId) =>
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== entryId),
    })),

  updateEntry: (entryId, patch) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId ? { ...e, ...patch } : e,
      ),
    })),

  setSuperset: (entryId, group) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId ? { ...e, supersetGroup: group } : e,
      ),
    })),

  addSet: (entryId) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId
          ? { ...e, sets: [...e.sets, { id: uid(), validated: false }] }
          : e,
      ),
    })),

  updateSet: (entryId, setId, patch) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((st) =>
                st.id === setId ? { ...st, ...patch } : st,
              ),
            }
          : e,
      ),
    })),

  removeSet: (entryId, setId) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId
          ? { ...e, sets: e.sets.filter((st) => st.id !== setId) }
          : e,
      ),
    })),

  validateSet: (entryId, setId, validated) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((st) =>
                st.id === setId ? { ...st, validated } : st,
              ),
            }
          : e,
      ),
    })),

  resetDraft: () => set({ ...emptyDraft() }),

  loadFromWorkout: (workout, exerciseMap) => {
    const entries: DraftEntry[] = [];
    for (const e of workout.entries) {
      const ex = exerciseMap.get(e.exerciseId);
      // Skip exercises that no longer exist in the catalogue.
      if (!ex) continue;
      entries.push({
        id: uid(),
        exerciseId: e.exerciseId,
        variantId: e.variantId ?? null,
        notes: e.notes ?? "",
        supersetGroup: e.supersetGroup ?? null,
        sets: e.sets.map((st) => ({
          id: uid(),
          reps: st.reps ?? undefined,
          holdSeconds: st.holdSeconds ?? undefined,
          weightKg: st.weightKg ?? undefined,
          rpe: st.rpe ?? undefined,
          validated: false,
        })),
      });
    }
    set({
      title: workout.title ? `${workout.title} (repeat)` : "",
      date: format(new Date(), "yyyy-MM-dd"),
      durationMin: workout.durationMin ?? "",
      exertion: workout.perceivedExertion ?? 5,
      bodyweight: workout.bodyweightKg ?? 72,
      notes: workout.notes ?? "",
      defaultRestSec: 90,
      entries,
    });
  },
}));

/// Selector helper: compute the next available superset group number.
export function nextSupersetGroup(entries: DraftEntry[]): number {
  const used = new Set(
    entries.map((e) => e.supersetGroup).filter((g): g is number => g != null),
  );
  let n = 1;
  while (used.has(n)) n++;
  return n;
}
