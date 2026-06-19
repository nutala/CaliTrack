"use client";

import * as React from "react";
import { Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/use-data";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLOR_PRESETS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#e11d48",
  "#0ea5e9",
  "#a855f7",
  "#22c55e",
  "#eab308",
  "#64748b",
];

const EMOJI_PRESETS = [
  "💪",
  "🧗",
  "🦵",
  "🔥",
  "⚖️",
  "🎯",
  "🤸",
  "🤲",
  "⚡",
  "🏋️",
  "🤾",
  "🏃",
  "🧘",
  "💠",
  "⭐",
  "🌟",
  "💪🏽",
  "🦿",
  "❤️",
  "🫁",
];

export function CategoryManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: categories = [], isLoading } = useCategories();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [deleting, setDeleting] = React.useState<Category | null>(null);

  const openCreate = React.useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = React.useCallback((c: Category) => {
    setEditing(c);
    setFormOpen(true);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gérer les catégories</DialogTitle>
            <DialogDescription>
              Créez, modifiez ou supprimez les catégories d&apos;exercices.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button size="sm" onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle catégorie
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucune catégorie pour l&apos;instant. Cliquez sur
              «&nbsp;Nouvelle catégorie&nbsp;» pour commencer.
            </div>
          ) : (
            <ul
              className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1"
              role="list"
            >
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg leading-none"
                    style={{ backgroundColor: `${c.color}22` }}
                    aria-hidden="true"
                  >
                    {c.emoji || "•"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.label || c.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.name}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full border border-border/60"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(c)}
                      aria-label={`Modifier ${c.label || c.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(c)}
                      aria-label={`Supprimer ${c.label || c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <DeleteCategoryDialog
        open={deleting !== null}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        category={deleting}
        categories={categories}
      />
    </>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Category | null;
}) {
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();

  const [name, setName] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [color, setColor] = React.useState<string>(COLOR_PRESETS[0]);
  const [emoji, setEmoji] = React.useState<string>(EMOJI_PRESETS[0]);

  // Sync local state when the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setLabel(editing.label);
      setColor(editing.color || COLOR_PRESETS[0]);
      setEmoji(editing.emoji || EMOJI_PRESETS[0]);
    } else {
      setName("");
      setLabel("");
      setColor(COLOR_PRESETS[0]);
      setEmoji(EMOJI_PRESETS[0]);
    }
  }, [open, editing]);

  const isEdit = editing !== null;
  const submitting = createMut.isPending || updateMut.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Le nom interne est requis");
      return;
    }
    const trimmedLabel = label.trim() || trimmedName;
    const finalEmoji = emoji.trim() || "•";
    try {
      if (isEdit && editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          body: { label: trimmedLabel, color, emoji: finalEmoji },
        });
      } else {
        await createMut.mutateAsync({
          name: trimmedName,
          label: trimmedLabel,
          color,
          emoji: finalEmoji,
        });
      }
      onOpenChange(false);
    } catch {
      // handled by mutation onError (toast)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="cat-name">Nom interne</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEdit}
              placeholder="ex. push"
              className={cn(isEdit && "opacity-70")}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Identifiant technique utilisé en base. Non modifiable après
              création.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="cat-label">Libellé affiché</Label>
            <Input
              id="cat-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Push"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Couleur</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {COLOR_PRESETS.map((c) => {
                const selected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Couleur ${c}`}
                    aria-pressed={selected}
                    onClick={() => setColor(c)}
                    className="relative flex h-7 w-7 items-center justify-center rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    style={{ backgroundColor: c }}
                  >
                    {selected ? (
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Emoji</Label>
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_PRESETS.map((em) => {
                const selected = emoji === em;
                return (
                  <button
                    key={em}
                    type="button"
                    aria-label={`Emoji ${em}`}
                    aria-pressed={selected}
                    onClick={() => setEmoji(em)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md text-base leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selected
                        ? "bg-primary/15 ring-1 ring-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    {em}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Label
                htmlFor="cat-emoji-custom"
                className="shrink-0 text-xs text-muted-foreground"
              >
                Personnalisé
              </Label>
              <Input
                id="cat-emoji-custom"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                className="h-8 w-20 text-center"
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Aperçu</Label>
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md text-base leading-none"
                style={{ backgroundColor: `${color}22` }}
                aria-hidden="true"
              >
                {emoji || "•"}
              </span>
              <Badge
                style={{ backgroundColor: color, color: "#ffffff" }}
                className="border-transparent"
              >
                {label || name || "Aperçu"}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category | null;
  categories: Category[];
}) {
  const deleteMut = useDeleteCategory();
  const [reassignId, setReassignId] = React.useState<string>("");

  const others = React.useMemo(
    () => categories.filter((c) => c.id !== category?.id),
    [categories, category],
  );

  // Default the reassignment target to the first other category.
  React.useEffect(() => {
    if (!open) return;
    setReassignId(others.length > 0 ? others[0].id : "");
  }, [open, others]);

  const submitting = deleteMut.isPending;

  async function onConfirm() {
    if (!category) return;
    try {
      await deleteMut.mutateAsync({
        id: category.id,
        reassign: reassignId || undefined,
      });
      onOpenChange(false);
    } catch {
      // handled by mutation onError (toast)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Supprimer «&nbsp;{category?.label || category?.name}&nbsp;»&nbsp;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Les exercices de cette catégorie seront réaffectés à la catégorie
            sélectionnée ci-dessous. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {others.length > 0 ? (
          <div className="grid gap-1.5">
            <Label htmlFor="reassign-select">Réaffecter les exercices vers</Label>
            <Select value={reassignId} onValueChange={setReassignId}>
              <SelectTrigger id="reassign-select" className="w-full">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {others.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="mr-1.5" aria-hidden="true">
                      {c.emoji || "•"}
                    </span>
                    {c.label || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-300">
            Aucune autre catégorie disponible. Les exercices de cette catégorie
            resteront sans catégorie.
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Supprimer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
