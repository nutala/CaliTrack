"use client";

import * as React from "react";
import {
  Plus,
  PlusCircle,
  Trash2,
  Save,
  ArrowLeft,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useExercises, useSaveTemplate } from "@/hooks/use-data";
import { useAppStore } from "@/lib/store";
import { useCategoryMeta } from "@/hooks/use-data";
import type {
  ExerciseWithVariants,
  ExerciseCategory,
} from "@/lib/types";
import { difficultyStars } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/app/common";
import { ExercisePickerDialog } from "@/components/app/exercise-picker-dialog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EditorSet {
  id: string;
  targetReps?: number;
  targetHoldSeconds?: number;
  targetWeightKg?: number;
  targetRpe?: number;
}

interface EditorEntry {
  id: string;
  exerciseId: string;
  variantId: string | null;
  supersetGroup: number | null;
  notes: string;
  sets: EditorSet[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _eid = 0;
function uid() {
  _eid++;
  return `te-${_eid}-${Math.random().toString(36).slice(2, 6)}`;
}

function defaultSets(exercise: ExerciseWithVariants): EditorSet[] {
  return [
    {
      id: uid(),
      ...(exercise.isStatic
        ? { targetHoldSeconds: undefined }
        : { targetReps: undefined }),
    },
  ];
}

function firstVariant(exercise: ExerciseWithVariants): string | null {
  const sorted = exercise.variants
    ?.slice()
    .sort((a, b) => a.difficultyLevel - b.difficultyLevel);
  return sorted?.[0]?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  View                                                               */
/* ------------------------------------------------------------------ */

export function TemplateEditorView() {
  const { viewTemplateEditor, closeTemplateEditor, templateEditorId } =
    useAppStore();
  const { data: exercises } = useExercises();
  const saveTemplate = useSaveTemplate();
  const getCatMeta = useCategoryMeta();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [entries, setEntries] = React.useState<EditorEntry[]>([]);

  const exerciseMap = React.useMemo(() => {
    const m = new Map<string, ExerciseWithVariants>();
    for (const ex of exercises ?? []) m.set(ex.id, ex);
    return m;
  }, [exercises]);

  /* Load existing template for editing */
  const loaded = React.useRef(false);
  React.useEffect(() => {
    if (templateEditorId && exercises && !loaded.current) {
      const tpl = exercises
        ? null
        : null; /* we'll fetch separately if needed */
      fetch(`/api/templates/${templateEditorId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.name) {
            setName(data.name ?? "");
            setNotes(data.notes ?? "");
            setEntries(
              data.entries?.map((e: Record<string, unknown>) => ({
                id: uid(),
                exerciseId: e.exerciseId as string,
                variantId: (e.variantId as string) ?? null,
                supersetGroup: (e.supersetGroup as number) ?? null,
                notes: (e.notes as string) ?? "",
                sets: ((e.sets as Array<Record<string, unknown>>) ?? []).map(
                  (s) => ({
                    id: uid(),
                    targetReps: s.targetReps as number | undefined,
                    targetHoldSeconds:
                      s.targetHoldSeconds as number | undefined,
                    targetWeightKg: s.targetWeightKg as number | undefined,
                    targetRpe: s.targetRpe as number | undefined,
                  }),
                ),
              })),
            );
          }
          loaded.current = true;
        })
        .catch(() => {
          toast.error("Impossible de charger le template");
        });
    }
  }, [templateEditorId, exercises]);

  /* Reset when creating new */
  React.useEffect(() => {
    if (!templateEditorId) {
      loaded.current = false;
      setName("");
      setNotes("");
      setEntries([]);
    }
  }, [templateEditorId]);

  function handlePickExercise(ex: ExerciseWithVariants) {
    setEntries((prev) => [
      ...prev,
      {
        id: uid(),
        exerciseId: ex.id,
        variantId: firstVariant(ex),
        supersetGroup: null,
        notes: "",
        sets: defaultSets(ex),
      },
    ]);
    setPickerOpen(false);
  }

  function updateEntry(id: string, patch: Partial<EditorEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function addSet(entryId: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const ex = exerciseMap.get(e.exerciseId);
        const lastSet = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              id: uid(),
              targetReps: lastSet?.targetReps ?? undefined,
              targetHoldSeconds: lastSet?.targetHoldSeconds ?? undefined,
              targetWeightKg: lastSet?.targetWeightKg ?? undefined,
              targetRpe: lastSet?.targetRpe ?? undefined,
            },
          ],
        };
      }),
    );
  }

  function updateSet(
    entryId: string,
    setId: string,
    patch: Partial<EditorSet>,
  ) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            }
          : e,
      ),
    );
  }

  function removeSet(entryId: string, setId: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e,
      ),
    );
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Le nom du template est obligatoire");
      return;
    }
    if (entries.length === 0) {
      toast.error("Ajoute au moins un exercice");
      return;
    }
    setSaving(true);
    try {
      await saveTemplate.mutateAsync({
        id: templateEditorId ?? undefined,
        name: trimmedName,
        notes: notes || undefined,
        entries: entries.map((e) => ({
          exerciseId: e.exerciseId,
          variantId: e.variantId || null,
          supersetGroup: e.supersetGroup,
          notes: e.notes || undefined,
          sets: e.sets.map((s) => ({
            targetReps: s.targetReps,
            targetHoldSeconds: s.targetHoldSeconds,
            targetWeightKg: s.targetWeightKg,
            targetRpe: s.targetRpe,
          })),
        })),
      });
      closeTemplateEditor();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeTemplateEditor}
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">
              {templateEditorId ? "Modifier le template" : "Nouveau template"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Prépare ta séance à l&apos;avance
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>

      {/* Template name */}
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du template (ex. Push max)"
        className="h-10 text-base font-medium"
      />

      {/* Notes */}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optionnel)"
        className="min-h-[60px] resize-none"
      />

      <Separator />

      {/* Entries */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Aucun exercice"
            description="Ajoute des exercices pour construire ton template."
            action={
              <Button onClick={() => setPickerOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                Ajouter un exercice
              </Button>
            }
          />
        ) : (
          entries.map((entry) => {
            const ex = exerciseMap.get(entry.exerciseId);
            if (!ex) return null;
            const cat = ex.category as ExerciseCategory;
            const meta = getCatMeta(cat);
            const isStatic = ex.isStatic;
            const sortedVariants = ex.variants
              ?.slice()
              .sort((a, b) => a.difficultyLevel - b.difficultyLevel);
            return (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="text-base leading-none">
                        {meta.emoji}
                      </span>
                      <CardTitle className="truncate text-base">
                        {ex.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="border-transparent"
                        style={{
                          backgroundColor: `${meta.color}22`,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </Badge>
                      {isStatic && (
                        <Badge variant="secondary" className="text-[10px]">
                          Maintien (s)
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEntry(entry.id)}
                      aria-label={`Retirer ${ex.name}`}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Variant */}
                  {sortedVariants && sortedVariants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Variante
                      </span>
                      <select
                        value={entry.variantId ?? sortedVariants[0]?.id ?? ""}
                        onChange={(e) =>
                          updateEntry(entry.id, {
                            variantId: e.target.value || null,
                          })
                        }
                        className="h-7 rounded-md border border-border/60 bg-background px-1.5 text-xs tabular-nums outline-none focus:ring-2 focus:ring-ring"
                      >
                        {sortedVariants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} {difficultyStars(v.difficultyLevel)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sets */}
                  {entry.sets.length > 0 && (
                    <div className="space-y-2">
                      {entry.sets.map((set, idx) => (
                        <div
                          key={set.id}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <div className="w-10 text-xs font-medium text-muted-foreground">
                            #{idx + 1}
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] font-medium uppercase text-muted-foreground">
                              {isStatic ? "Maintien" : "Reps"}
                            </label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder={isStatic ? "30" : "8"}
                              value={
                                isStatic
                                  ? (set.targetHoldSeconds ?? "")
                                  : (set.targetReps ?? "")
                              }
                              onChange={(e) => {
                                const v =
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value) || undefined;
                                updateSet(entry.id, set.id, {
                                  ...(isStatic
                                    ? { targetHoldSeconds: v }
                                    : { targetReps: v }),
                                });
                              }}
                              className="h-8 w-16 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] font-medium uppercase text-muted-foreground">
                              Poids
                            </label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              value={set.targetWeightKg ?? ""}
                              onChange={(e) => {
                                const v =
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value) || undefined;
                                updateSet(entry.id, set.id, {
                                  targetWeightKg: v,
                                });
                              }}
                              className="h-8 w-16 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="text-xs text-muted-foreground">
                              kg
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] font-medium uppercase text-muted-foreground">
                              RPE
                            </label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={1}
                              max={10}
                              placeholder="7"
                              value={set.targetRpe ?? ""}
                              onChange={(e) => {
                                const v =
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value) || undefined;
                                updateSet(entry.id, set.id, {
                                  targetRpe: v,
                                });
                              }}
                              className="h-8 w-14 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeSet(entry.id, set.id)}
                            aria-label={`Supprimer la série ${idx + 1}`}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSet(entry.id)}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une série
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add exercise button */}
      {entries.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setPickerOpen(true)}
            className="gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Ajouter un exercice
          </Button>
        </div>
      )}

      {/* Exercise picker */}
      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickExercise}
      />
    </div>
  );
}
