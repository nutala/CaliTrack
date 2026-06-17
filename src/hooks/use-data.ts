"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, qk } from "@/lib/api-client";
import { toast } from "sonner";
import type {
  ExerciseWithVariants,
  WorkoutFull,
  OverviewStats,
  TopExercise,
  ProgressPoint,
  Exercise,
} from "@/lib/types";

/** ----- Exercises ----- */
export function useExercises() {
  return useQuery<ExerciseWithVariants[]>({
    queryKey: qk.exercises,
    queryFn: () => api.get<ExerciseWithVariants[]>("/api/exercises"),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Exercise> & { name: string }) =>
      api.post<ExerciseWithVariants>("/api/exercises", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.exercises });
      qc.invalidateQueries({ queryKey: qk.overview });
      toast.success("Exercise created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<Exercise>;
    }) => api.patch<ExerciseWithVariants>(`/api/exercises/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.exercises });
      toast.success("Exercise updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/exercises/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.exercises });
      qc.invalidateQueries({ queryKey: qk.overview });
      qc.invalidateQueries({ queryKey: qk.topExercises });
      toast.success("Exercise deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      exerciseId,
      body,
    }: {
      exerciseId: string;
      body: {
        name: string;
        difficultyLevel?: number;
        description?: string;
        targetValue?: number;
      };
    }) =>
      api.post(`/api/exercises/${exerciseId}/variants`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.exercises });
      toast.success("Variant added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => api.patch(`/api/variants/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.exercises });
      toast.success("Variant updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/variants/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.exercises });
      toast.success("Variant removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** ----- Workouts ----- */
export function useWorkouts() {
  return useQuery<WorkoutFull[]>({
    queryKey: qk.workouts,
    queryFn: () => api.get<WorkoutFull[]>("/api/workouts?limit=100"),
  });
}

export type NewWorkoutPayload = {
  date?: string;
  title?: string;
  durationMin?: number;
  perceivedExertion?: number;
  bodyweightKg?: number;
  notes?: string;
  entries: {
    exerciseId: string;
    variantId?: string | null;
    supersetGroup?: number | null;
    notes?: string;
    sets: {
      reps?: number;
      holdSeconds?: number;
      weightKg?: number;
      rpe?: number;
    }[];
  }[];
};

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewWorkoutPayload) =>
      api.post<WorkoutFull>("/api/workouts", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.workouts });
      qc.invalidateQueries({ queryKey: qk.overview });
      qc.invalidateQueries({ queryKey: qk.topExercises });
      qc.invalidateQueries({ queryKey: ["stats", "progress"] });
      toast.success("Workout logged 🎉");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => api.patch(`/api/workouts/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.workouts });
      qc.invalidateQueries({ queryKey: qk.overview });
      toast.success("Workout updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/workouts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.workouts });
      qc.invalidateQueries({ queryKey: qk.overview });
      qc.invalidateQueries({ queryKey: qk.topExercises });
      toast.success("Workout deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** ----- Stats ----- */
export function useOverview() {
  return useQuery<OverviewStats>({
    queryKey: qk.overview,
    queryFn: () => api.get<OverviewStats>("/api/stats/overview"),
  });
}

export function useTopExercises() {
  return useQuery<TopExercise[]>({
    queryKey: qk.topExercises,
    queryFn: () => api.get<TopExercise[]>("/api/stats/top-exercises"),
  });
}

export function useProgress(exerciseId?: string, variantId?: string | null) {
  return useQuery<{
    exercise: Exercise;
    points: ProgressPoint[];
  }>({
    queryKey: qk.progress(exerciseId ?? "", variantId),
    queryFn: () => {
      const params = new URLSearchParams();
      if (exerciseId) params.set("exerciseId", exerciseId);
      if (variantId) params.set("variantId", variantId);
      return api.get(`/api/stats/progress?${params.toString()}`);
    },
    enabled: !!exerciseId,
  });
}
