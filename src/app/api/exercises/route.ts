import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/exercises — list all exercises with their variants. */
export async function GET() {
  const exercises = await db.exercise.findMany({
    include: {
      variants: {
        orderBy: { difficultyLevel: "asc" },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(exercises);
}

/** POST /api/exercises — create a new exercise. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }
  try {
    const created = await db.exercise.create({
      data: {
        name: body.name.trim(),
        category: body.category ?? "Push",
        muscleGroup: body.muscleGroup ?? "Full body",
        isStatic: Boolean(body.isStatic),
        description: body.description ?? null,
        equipment: body.equipment ?? null,
      },
      include: { variants: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create exercise";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
