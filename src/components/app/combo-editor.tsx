"use client";

import * as React from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Check, X, Weight, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useExercises, useCategoryMeta } from "@/hooks/use-data";
import type { ExerciseWithVariants, ExerciseCategory, ComboStep } from "@/lib/types";
import { difficultyStars } from "@/lib/calc";
import { ExercisePickerDialog } from "@/components/app/exercise-picker-dialog";

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cs-${Math.random().toString(36).slice(2, 10)}`;
}

interface ComboEditorProps {
  steps: ComboStep[];
  weightKg?: number;
  rpe?: number;
  validated: boolean;
  failedSteps: string[];
  onAddStep: (step: ComboStep) => void;
  onRemoveStep: (stepId: string) => void;
  onUpdateStep: (stepId: string, patch: Partial<ComboStep>) => void;
  onReorderStep: (stepId: string, direction: "up" | "down") => void;
  onToggleValidated?: () => void;
  onToggleStepFailed?: (stepId: string) => void;
  onWeightKgChange?: (value: number | undefined) => void;
  onRpeChange?: (value: number | undefined) => void;
  readOnly?: boolean;
}

function sortVariants(variants: { id: string; name: string; difficultyLevel: number }[]) {
  return variants.slice().sort((a, b) => a.difficultyLevel - b.difficultyLevel);
}

export function ComboEditor({
  steps,
  weightKg,
  rpe,
  validated,
  failedSteps,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onReorderStep,
  onToggleValidated,
  onToggleStepFailed,
  onWeightKgChange,
  onRpeChange,
  readOnly,
}: ComboEditorProps) {
  const { data: exercises } = useExercises();
  const getCatMeta = useCategoryMeta();
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const exerciseMap = React.useMemo(() => {
    const m = new Map<string, ExerciseWithVariants>();
    for (const ex of exercises ?? []) m.set(ex.id, ex);
    return m;
  }, [exercises]);

  function handlePickExercise(ex: ExerciseWithVariants) {
    const newStep: ComboStep = {
      id: uid(),
      exerciseId: ex.id,
      exerciseName: ex.name,
      category: ex.category,
      isStatic: ex.isStatic,
      mode: ex.isStatic ? "hold" : "reps",
    };
    onAddStep(newStep);
    setPickerOpen(false);
  }

  const combosExerciseId = exercises?.find((ex) => ex.name === "Combos")?.id;

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          {onWeightKgChange && (
            <div className="flex items-center gap-1.5">
              <Weight className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                inputMode="decimal"
                step={0.5}
                placeholder="Poids (kg)"
                value={weightKg ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onWeightKgChange(v === "" ? undefined : Number(v) || undefined);
                }}
                className="h-8 w-24 tabular-nums"
                aria-label="Poids du combo"
              />
            </div>
          )}
          {onRpeChange && (
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                inputMode="decimal"
                min={1}
                max={10}
                placeholder="RPE"
                value={rpe ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onRpeChange(v === "" ? undefined : Number(v) || undefined);
                }}
                className="h-8 w-20 tabular-nums"
                aria-label="RPE du combo"
              />
            </div>
          )}
          {onToggleValidated && (
            <Button
              variant={validated ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 gap-1.5",
                validated && "bg-emerald-600 hover:bg-emerald-700",
              )}
              onClick={onToggleValidated}
            >
              {validated ? (
                <><Check className="h-3.5 w-3.5" /> Validé</>
              ) : (
                <><X className="h-3.5 w-3.5" /> Marquer validé</>
              )}
            </Button>
          )}
        </div>
      )}

      {steps.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucune étape — ajoute des exercices à ce combo.
        </p>
      ) : (
        <div className="space-y-1.5">
          {steps.map((step, idx) => {
            const ex = exerciseMap.get(step.exerciseId);
            const variants = ex?.variants ? sortVariants(ex.variants) : [];
            const catMeta = getCatMeta(step.category);
            const isFailed = failedSteps.includes(step.id);
            const mode = step.mode ?? (step.isStatic ? "hold" : "reps");
            const otherMode = mode === "reps" ? "hold" : "reps";
            const isLast = idx === steps.length - 1;
            const isFirst = idx === 0;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors",
                  isFailed && "border-red-400/50 bg-red-500/10",
                  validated && !isFailed && "border-emerald-500/30 bg-emerald-500/8",
                )}
              >
                <span className="w-5 text-right text-xs font-medium text-muted-foreground tabular-nums">
                  {idx + 1}
                </span>

                {idx > 0 && (
                  <span className="text-lg leading-none text-muted-foreground/40">➔</span>
                )}

                <span className="max-w-[120px] truncate font-medium">
                  {step.exerciseName}
                </span>
                <Badge
                  variant="outline"
                  className="border-transparent px-1.5 py-0 text-[9px] leading-tight"
                  style={{ backgroundColor: `${catMeta.color}22`, color: catMeta.color }}
                >
                  {catMeta.label}
                </Badge>

                {!readOnly ? (
                  <>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStep(step.id, {
                            mode: otherMode,
                            reps: otherMode === "reps" ? undefined : step.reps,
                            holdSeconds: otherMode === "hold" ? undefined : step.holdSeconds,
                          })
                        }
                        className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      >
                        {mode === "reps" ? "Reps" : "Maintien"}
                      </button>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder={mode === "hold" ? "3" : "3"}
                        value={mode === "reps" ? (step.reps ?? "") : (step.holdSeconds ?? "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          onUpdateStep(step.id, {
                            ...(mode === "reps"
                              ? { reps: v === "" ? undefined : Number(v) || undefined }
                              : { holdSeconds: v === "" ? undefined : Number(v) || undefined }
                            ),
                          });
                        }}
                        className="h-7 w-14 tabular-nums"
                      />
                    </div>

                    {variants.length > 0 && (
                      <select
                        value={step.variantId ?? variants[0]?.id ?? ""}
                        onChange={(e) => {
                          const vid = e.target.value;
                          const v = variants.find((vx) => vx.id === vid);
                          onUpdateStep(step.id, {
                            variantId: vid || null,
                            variantName: v?.name ?? null,
                          });
                        }}
                        className="h-7 max-w-[100px] rounded-md border border-border/60 bg-background px-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                      >
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} {difficultyStars(v.difficultyLevel)}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                ) : (
                  <span className="text-sm tabular-nums">
                    {mode === "reps"
                      ? `${step.reps ?? "—"} reps`
                      : `${step.holdSeconds ?? "—"}s`}
                  </span>
                )}

                <div className="flex-1" />

                {!readOnly && (
                  <div className="flex items-center gap-0.5">
                    {onToggleStepFailed && (
                      <button
                        type="button"
                        onClick={() => onToggleStepFailed(step.id)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-colors",
                          isFailed
                            ? "bg-red-500 text-white"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                        title={isFailed ? "Marquer réussie" : "Marquer échouée"}
                      >
                        ✗
                      </button>
                    )}
                    {!isFirst && (
                      <button
                        type="button"
                        onClick={() => onReorderStep(step.id, "up")}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                        title="Monter"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isLast && (
                      <button
                        type="button"
                        onClick={() => onReorderStep(step.id, "down")}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                        title="Descendre"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveStep(step.id)}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                      title="Retirer l'étape"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Ajouter une étape
        </Button>
      )}

      <Separator />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="tabular-nums font-medium text-foreground">{steps.length}</span>{" "}
          étape{steps.length > 1 ? "s" : ""}
        </span>
        {validated && (
          <span className="text-emerald-500">
            <span className="tabular-nums font-medium">Validé</span>
          </span>
        )}
        {failedSteps.length > 0 && (
          <span className="text-red-500">
            <span className="tabular-nums font-medium">{failedSteps.length}</span> échouée{failedSteps.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickExercise}
        title="Ajouter une étape au combo"
        description="Choisis l'exercice à insérer dans le combo."
        excludeIds={combosExerciseId ? [combosExerciseId] : undefined}
      />
    </div>
  );
}
