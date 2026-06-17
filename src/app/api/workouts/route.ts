import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/workouts — list workouts (newest first), with entries summary. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  const workouts = await db.workout.findMany({
    include: {
      entries: {
        include: {
          exercise: true,
          variant: true,
          sets: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(workouts);
}

/**
 * POST /api/workouts — create a workout with nested entries and sets.
 *
 * Body shape:
 * {
 *   date?: string (ISO), title?, durationMin?, perceivedExertion?, bodyweightKg?, notes?,
 *   entries: [
 *     { exerciseId, variantId?, notes?, sets: [ { reps?, holdSeconds?, weightKg?, rpe? } ] }
 *   ]
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json(
      { error: "At least one entry is required" },
      { status: 400 },
    );
  }

  // Validate entries
  for (const e of body.entries) {
    if (typeof e.exerciseId !== "string") {
      return NextResponse.json(
        { error: "Each entry needs an exerciseId" },
        { status: 400 },
      );
    }
    if (!Array.isArray(e.sets) || e.sets.length === 0) {
      return NextResponse.json(
        { error: "Each entry needs at least one set" },
        { status: 400 },
      );
    }
  }

  try {
    const created = await db.$transaction(async (tx) => {
      const workout = await tx.workout.create({
        data: {
          date: body.date ? new Date(body.date) : new Date(),
          title: body.title ?? null,
          durationMin: body.durationMin ?? null,
          perceivedExertion: body.perceivedExertion ?? null,
          bodyweightKg: body.bodyweightKg ?? null,
          notes: body.notes ?? null,
        },
      });

      for (const e of body.entries) {
        const entry = await tx.workoutEntry.create({
          data: {
            workoutId: workout.id,
            exerciseId: e.exerciseId,
            variantId: e.variantId || null,
            notes: e.notes ?? null,
          },
        });
        await tx.workoutSet.createMany({
          data: e.sets.map(
            (s: {
              reps?: number;
              holdSeconds?: number;
              weightKg?: number;
              rpe?: number;
            },
            i: number) => ({
              workoutEntryId: entry.id,
              setNumber: i + 1,
              reps: s.reps ?? null,
              holdSeconds: s.holdSeconds ?? null,
              weightKg: s.weightKg ?? null,
              rpe: s.rpe ?? null,
            }),
          ),
        });
      }

      return tx.workout.findUnique({
        where: { id: workout.id },
        include: {
          entries: {
            include: { exercise: true, variant: true, sets: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create workout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
