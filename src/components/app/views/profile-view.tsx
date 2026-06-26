"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Loader2, Save, User } from "lucide-react";
import { useUpdateProfile } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileView() {
  const { data: session, update } = useSession();
  const mutation = useUpdateProfile();
  const user = session?.user;

  const [name, setName] = React.useState("");
  const [image, setImage] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  React.useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setImage(user.image ?? "");
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Connecte-toi pour accéder à ton profil.
      </div>
    );
  }

  const initials = (user.name ?? user.email ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      return;
    }
    const body: { name?: string; image?: string; newPassword?: string } = {};
    if (name !== (user.name ?? "")) body.name = name;
    if (image !== (user.image ?? "")) body.image = image;
    if (newPassword) body.newPassword = newPassword;

    if (Object.keys(body).length === 0) return;

    await mutation.mutateAsync(body);
    update();
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mon Profil</h1>
          <p className="text-sm text-muted-foreground">
            Modifie tes informations personnelles
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photo de profil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={image || undefined} alt={name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{name || "Utilisateur"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="profile-name">Nom</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ton nom"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="profile-image">URL de la photo de profil</Label>
              <Input
                id="profile-image"
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Changer le mot de passe (optionnel)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="profile-password">Nouveau mot de passe</Label>
                  <Input
                    id="profile-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 caractères"
                    minLength={6}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="profile-confirm">Confirmer</Label>
                  <Input
                    id="profile-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répète le mot de passe"
                  />
                </div>
              </div>
              {newPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-destructive">
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="gap-2"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
