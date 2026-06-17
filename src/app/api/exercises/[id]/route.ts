import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/exercises/[id] */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const updated = await db.exercise.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.muscleGroup !== undefined
          ? { muscleGroup: body.muscleGroup }
          : {}),
        ...(body.isStatic !== undefined ? { isStatic: Boolean(body.isStatic) } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.equipment !== undefined ? { equipment: body.equipment } : {}),
      },
      include: { variants: { orderBy: { difficultyLevel: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** DELETE /api/exercises/[id] */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await db.exercise.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
