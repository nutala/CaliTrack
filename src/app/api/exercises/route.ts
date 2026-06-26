import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/exercises — list exercises visible to the current user. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const exercises = await db.exercise.findMany({
    where: userId ? { OR: [{ userId: null }, { userId }] } : { userId: null },
    include: {
      variants: { orderBy: { difficultyLevel: "asc" } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(exercises);
}

/** POST /api/exercises — create a new exercise (assigned to the logged-in user). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
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
        userId,
      },
      include: { variants: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec";
    if (message.includes("Unique constraint") && message.includes("name")) {
      return NextResponse.json(
        { error: `Un exercice nommé « ${body.name.trim()} » existe déjà.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
