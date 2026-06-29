import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/sets/last?exerciseId=X&variantId=Y
 *
 * Returns the most recently performed WorkoutSet for the given exercise
 * and variant, or null if none exists.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const url = new URL(req.url);
  const exerciseId = url.searchParams.get("exerciseId");
  const variantId = url.searchParams.get("variantId");

  if (!exerciseId) {
    return NextResponse.json(
      { error: "exerciseId est requis" },
      { status: 400 },
    );
  }

  const set = await db.workoutSet.findFirst({
    where: {
      variantId: variantId || null,
      workoutEntry: {
        exerciseId,
        workout: userId ? { userId } : { userId: null },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      reps: true,
      holdSeconds: true,
      weightKg: true,
      rpe: true,
      createdAt: true,
    },
  });

  return NextResponse.json(set);
}
