import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format } from "date-fns";
import type { ProgressPoint } from "@/lib/types";

/**
 * GET /api/stats/progress?exerciseId=...&variantId=...&limit=60
 * Returns the progression of best performance per workout for the given
 * exercise (optionally filtered by variant).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const exerciseId = url.searchParams.get("exerciseId");
  if (!exerciseId) {
    return NextResponse.json(
      { error: "exerciseId is required" },
      { status: 400 },
    );
  }
  const variantId = url.searchParams.get("variantId") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "60"), 200);

  const exercise = await db.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const where = {
    exerciseId,
    ...(variantId ? { variantId } : {}),
  };

  const entries = await db.workoutEntry.findMany({
    where,
    include: {
      workout: true,
      variant: true,
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { workout: { date: "asc" } },
    take: limit,
  });

  const points: ProgressPoint[] = entries.map((e) => {
    const bestValue = Math.max(
      ...e.sets.map((s) => s.reps ?? s.holdSeconds ?? 0),
    );
    const totalVolume = e.sets.reduce(
      (acc, s) => acc + (s.reps ?? s.holdSeconds ?? 0),
      0,
    );
    const rpes = e.sets.map((s) => s.rpe).filter((v): v is number => v != null);
    const rpe = rpes.length ? Math.max(...rpes) : null;
    return {
      date: format(e.workout.date, "yyyy-MM-dd"),
      workoutId: e.workoutId,
      bestValue,
      totalVolume,
      setsCount: e.sets.length,
      rpe,
    };
  });

  return NextResponse.json({
    exercise,
    points,
  });
}
