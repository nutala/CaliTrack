import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TopExercise } from "@/lib/types";

/** GET /api/stats/top-exercises — top exercises by sessions (last 90 days). */
export async function GET() {
  const entries = await db.workoutEntry.findMany({
    include: {
      exercise: { include: { variants: true } },
      variant: true,
      sets: true,
      workout: { select: { date: true } },
    },
    orderBy: { workout: { date: "desc" } },
  });

  // Group by exercise
  const map = new Map<string, TopExercise & { lastDate: Date | null }>();
  for (const e of entries) {
    const existing = map.get(e.exerciseId);
    const metric = e.sets.reduce(
      (s, set) => s + (set.reps ?? set.holdSeconds ?? 0),
      0,
    );
    const bestSet = Math.max(
      ...e.sets.map((s) => s.reps ?? s.holdSeconds ?? 0),
      0,
    );
    const bestVariantLevel = e.variant?.difficultyLevel ?? 0;
    const bestVariantName = e.variant?.name ?? null;

    if (!existing) {
      map.set(e.exerciseId, {
        exerciseId: e.exerciseId,
        exerciseName: e.exercise.name,
        category: e.exercise.category,
        isStatic: e.exercise.isStatic,
        sessions: 1,
        totalSets: e.sets.length,
        totalVolume: metric,
        bestValue: bestSet,
        topVariantName: bestVariantName,
        lastPerformed: e.workout.date.toISOString(),
        lastDate: e.workout.date,
      });
    } else {
      existing.sessions += 1;
      existing.totalSets += e.sets.length;
      existing.totalVolume += metric;
      existing.bestValue = Math.max(existing.bestValue, bestSet);
      // Pick the highest-difficulty variant used
      if (e.variant && bestVariantLevel > 0) {
        const currentTopLevel =
          e.exercise.variants.find((v) => v.name === existing.topVariantName)
            ?.difficultyLevel ?? 0;
        if (bestVariantLevel > currentTopLevel) {
          existing.topVariantName = bestVariantName;
        }
      }
      if (
        !existing.lastDate ||
        e.workout.date > existing.lastDate
      ) {
        existing.lastDate = e.workout.date;
        existing.lastPerformed = e.workout.date.toISOString();
      }
    }
  }

  const top = Array.from(map.values())
    .sort((a, b) => b.sessions - a.sessions || b.totalVolume - a.totalVolume)
    .slice(0, 8)
    .map(({ lastDate, ...rest }) => rest);

  return NextResponse.json(top satisfies TopExercise[]);
}
