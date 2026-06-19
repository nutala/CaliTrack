import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([]);
  const categories = await db.category.findMany({
    where: { userId: session.user.id },
    orderBy: [{ name: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }
  try {
    const created = await db.category.create({
      data: {
        userId: session.user.id,
        name: body.name.trim(),
        label: (body.label as string)?.trim() || body.name.trim(),
        color: typeof body.color === "string" ? body.color : "#9ca3af",
        emoji: typeof body.emoji === "string" ? body.emoji : "•",
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Échec" }, { status: 400 });
  }
}
