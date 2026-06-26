import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { name, image, newPassword } = await req.json();

    const data: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof image === "string") data.image = image || null;
    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json(
          { error: "Mot de passe trop court (min 6 caractères)" },
          { status: 400 },
        );
      }
      data.password = hashPassword(newPassword);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data,
    });

    return NextResponse.json({
      name: user.name,
      email: user.email,
      image: user.image,
    });
  } catch (e) {
    console.error("[profile]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
