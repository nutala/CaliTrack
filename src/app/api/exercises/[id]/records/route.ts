import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";

type Params = { params: Promise<{ id: string }> };

export interface VariantRecord {
  variantId: string;
  variantName: string;
  targetValue: number | null;
  difficultyLevel: number;
  allTimeBest: {
    value: number;
    unit: string;
    weightKg: number | null;
    rpe: number | null;
    date: string;
    workoutId: string;
  } | null;
  recentPerformances: {
    value: number;
    weightKg: number | null;
    rpe: number | null;
    date: string;
    workoutId: string;
  }[];
}

export interface ExerciseRecords {
  exercise: { id: string; name: string; category: string; isStatic: boolean; description: string | null; equipment: string | null };
  variants: VariantRecord[];
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const exercise = await db.exercise.findUnique({ where: { id } });
  if (!exercise) return NextResponse.json({ error: "Exercice introuvable" }, { status: 404 });

  const variants = await db.exerciseVariant.findMany({
    where: { exerciseId: id },
    orderBy: { difficultyLevel: "asc" },
  });

  const entries = await db.workoutEntry.findMany({
    where: {
      exerciseId: id,
      workout: userId ? { userId } : { userId: null },
    },
    include: {
      workout: true,
      variant: true,
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { workout: { date: "desc" } },
  });

  const unit = exercise.isStatic ? "s" : "reps";

  const variantRecords: VariantRecord[] = variants.map((v) => {
    const relevantEntries = entries.filter(
      (e) =>
        e.variantId === v.id ||
        e.sets.some((s) => s.variantId === v.id),
    );

    const allSets = relevantEntries.flatMap((e) =>
      e.sets
        .filter((s) => s.variantId === v.id)
        .map((s) => ({
          ...s,
          workoutDate: e.workout.date,
          workoutId: e.workoutId,
        })),
    );

    if (allSets.length === 0) {
      return {
        variantId: v.id,
        variantName: v.name,
        targetValue: v.targetValue,
        difficultyLevel: v.difficultyLevel,
        allTimeBest: null,
        recentPerformances: [],
      };
    }

    const metric = (s: typeof allSets[number]) =>
      s.reps ?? s.holdSeconds ?? 0;

    const bestSet = allSets.reduce((a, b) => (metric(a) >= metric(b) ? a : b));

    const recentPerfs = relevantEntries
      .filter((e) => e.sets.some((s) => s.variantId === v.id))
      .slice(0, 5)
      .map((e) => {
        const variantSets = e.sets.filter((s) => s.variantId === v.id);
        const bestInEntry = variantSets.reduce((a, b) => {
          const mA = a.reps ?? a.holdSeconds ?? 0;
          const mB = b.reps ?? b.holdSeconds ?? 0;
          return mA >= mB ? a : b;
        });
        return {
          value: metric(bestInEntry),
          weightKg: bestInEntry.weightKg,
          rpe: bestInEntry.rpe,
          date: format(e.workout.date, "yyyy-MM-dd"),
          workoutId: e.workoutId,
        };
      });

    return {
      variantId: v.id,
      variantName: v.name,
      targetValue: v.targetValue,
      difficultyLevel: v.difficultyLevel,
      allTimeBest: {
        value: metric(bestSet),
        unit,
        weightKg: bestSet.weightKg,
        rpe: bestSet.rpe,
        date: format(bestSet.workoutDate, "yyyy-MM-dd"),
        workoutId: bestSet.workoutId,
      },
      recentPerformances: recentPerfs,
    };
  });

  const response: ExerciseRecords = {
    exercise: {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      isStatic: exercise.isStatic,
      description: exercise.description,
      equipment: exercise.equipment,
    },
    variants: variantRecords,
  };

  return NextResponse.json(response);
}
