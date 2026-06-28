"use client";

import * as React from "react";
import { ArrowLeft, Trophy, Calendar, Weight, Gauge, History, BarChart3, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useExerciseRecords } from "@/hooks/use-data";
import { useCategoryMeta } from "@/hooks/use-data";
import type { VariantRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutDetailDialog } from "@/components/app/workout-detail-dialog";

export function ExerciseDetailView() {
  const exerciseId = useAppStore((s) => s.exerciseDetailId);
  const setView = useAppStore((s) => s.setView);

  const { data, isLoading } = useExerciseRecords(exerciseId);

  if (!exerciseId) {
    setView("exercises");
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setView("exercises")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <>
              <h1 className="truncate text-xl font-bold text-foreground">
                {data?.exercise.name ?? "..."}
              </h1>
              {data?.exercise.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {data.exercise.description}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : data && data.variants.length > 0 ? (
        <div className="space-y-4">
          {data.variants.map((v) => (
            <VariantRecordCard key={v.variantId} record={v} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Aucune performance enregistrée pour cet exercice.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VariantRecordCard({ record }: { record: VariantRecord }) {
  const [showPrHistory, setShowPrHistory] = React.useState(false);
  const [dialogWorkoutId, setDialogWorkoutId] = React.useState<string | null>(null);
  const repeatWorkout = useAppStore((s) => s.repeatWorkout);

  const hasBest = record.allTimeBest !== null;
  const hasPrHistory = record.prHistory.length > 1;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {record.variantName}
            </h3>
            {record.targetValue != null && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Objectif : {record.targetValue} {record.allTimeBest?.unit ?? "reps"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasPrHistory && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setShowPrHistory((p) => !p)}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {showPrHistory ? "Masquer" : "Historique des PR"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* All-time best — clickable to open workout */}
          {hasBest ? (
            <button
              type="button"
              onClick={() => setDialogWorkoutId(record.allTimeBest!.workoutId)}
              className="w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
                <Trophy className="h-3.5 w-3.5" />
                Meilleure performance
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {record.allTimeBest.value}
                  <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                    {record.allTimeBest.unit}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {record.allTimeBest.date}
                </span>
                {record.allTimeBest.weightKg != null && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Weight className="h-3 w-3" />
                    {record.allTimeBest.weightKg} kg
                  </span>
                )}
                {record.allTimeBest.rpe != null && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Gauge className="h-3 w-3" />
                    RPE {record.allTimeBest.rpe}
                  </span>
                )}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 opacity-40" />
              Aucune série enregistrée pour cette variante
            </div>
          )}

          {/* PR History (expandable) */}
          {hasPrHistory && showPrHistory && (
            <div className="space-y-1.5 rounded-lg border border-border/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <History className="h-3 w-3" />
                Progression des records personnels
              </p>
              <div className="space-y-1">
                {record.prHistory.map((pr, i) => (
                  <button
                    key={`${pr.workoutId}-${i}`}
                    type="button"
                    onClick={() => setDialogWorkoutId(pr.workoutId)}
                    className="flex w-full items-center justify-between rounded-md bg-muted/20 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3 tabular-nums">
                      {i === 0 && (
                        <Trophy className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="font-medium text-foreground">
                        {pr.value} {pr.unit}
                      </span>
                      {pr.weightKg != null && (
                        <span className="text-muted-foreground">
                          {pr.weightKg} kg
                        </span>
                      )}
                      {pr.rpe != null && (
                        <span className="text-muted-foreground">
                          RPE {pr.rpe}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">{pr.date}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent performances — clickable to open workout */}
          {record.recentPerformances.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <History className="h-3 w-3" />
                Dernières séances
              </p>
              <div className="space-y-1">
                {record.recentPerformances.map((p, i) => (
                  <button
                    key={`${p.workoutId}-${i}`}
                    type="button"
                    onClick={() => setDialogWorkoutId(p.workoutId)}
                    className="flex w-full items-center justify-between rounded-md bg-muted/20 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="font-medium text-foreground">
                        {p.value}
                      </span>
                      {p.weightKg != null && (
                        <span className="text-muted-foreground">
                          {p.weightKg} kg
                        </span>
                      )}
                      {p.rpe != null && (
                        <span className="text-muted-foreground">
                          RPE {p.rpe}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">{p.date}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <WorkoutDetailDialog
        workoutId={dialogWorkoutId}
        onClose={() => setDialogWorkoutId(null)}
      />
    </>
  );
}
