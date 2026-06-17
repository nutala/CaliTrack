"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  PlusCircle,
  Plus,
  Trash2,
  Dumbbell,
  Save,
  Timer,
  Weight,
  Gauge,
  Check,
  Coffee,
  Link2,
  Link2Off,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  type ExerciseWithVariants,
  type ExerciseCategory,
  CATEGORY_META,
} from "@/lib/types";
import { metricUnit, fmtCompact, supersetLabel, supersetColor } from "@/lib/calc";
import {
  useExercises,
  useCreateWorkout,
  useWorkouts,
  type NewWorkoutPayload,
} from "@/hooks/use-data";
import { useAppStore } from "@/lib/store";
import {
  useDraftStore,
  nextSupersetGroup,
  type DraftEntry,
  type DraftSet,
} from "@/lib/draft-store";
import { useTimerStore, REST_PRESETS } from "@/lib/timer-store";
import { EmptyState, SectionHeading } from "@/components/app/common";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Adapter so `setMetric` (which expects the Prisma nullable shape) can read a DraftSet. */
function draftMetric(set: DraftSet): number {
  return (
    set.reps ??
    set.holdSeconds ??
    0
  );
}

/** Badge classes for perceived exertion (low → mid → high). */
function exertionBadgeClass(value: number): string {
  if (value <= 3)
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-500";
  if (value <= 6)
    return "border-amber-500/30 bg-amber-500/15 text-amber-500";
  return "border-red-500/30 bg-red-500/15 text-red-500";
}

/** Slider range/thumb color override via descendant selectors. */
function sliderAccentClass(value: number): string {
  if (value <= 3)
    return "[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500";
  if (value <= 6)
    return "[&_[data-slot=slider-range]]:bg-amber-500 [&_[data-slot=slider-thumb]]:border-amber-500";
  return "[&_[data-slot=slider-range]]:bg-red-500 [&_[data-slot=slider-thumb]]:border-red-500";
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export function NewWorkoutView() {
  // Global draft store — persists across view switches.
  const draft = useDraftStore();
  const exercisesQ = useExercises();
  const exercises = exercisesQ.data ?? [];
  const workoutsQ = useWorkouts();
  const createWorkout = useCreateWorkout();

  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Resolve exercise objects by id for the draft entries.
  const exerciseMap = React.useMemo(() => {
    const m = new Map<string, ExerciseWithVariants>();
    for (const ex of exercises) m.set(ex.id, ex);
    return m;
  }, [exercises]);

  // ----- Consume "Repeat workout" prefill on mount -----
  const repeatId = useAppStore((s) => s.repeatWorkoutId);
  const consumeRepeat = useAppStore((s) => s.consumeRepeat);
  React.useEffect(() => {
    const id = consumeRepeat();
    if (!id) return;
    const workout = workoutsQ.data?.find((w) => w.id === id);
    if (!workout) {
      toast.info("Workout data still loading — try again in a moment.");
      return;
    }
    draft.loadFromWorkout(workout, exerciseMap);
    toast.success(`Loaded "${workout.title || "session"}" — adjust and save.`);
  }, [repeatId, workoutsQ.data]);

  const { title, date, durationMin, exertion, bodyweight, notes, defaultRestSec, entries } = draft;

  function addEntry(exercise: ExerciseWithVariants) {
    draft.addEntry(exercise);
    setPickerOpen(false);
  }

  // ----- derived totals for the sticky bar -----
  const totalSets = entries.reduce((acc, e) => acc + e.sets.length, 0);
  const totalVolume = entries.reduce(
    (acc, e) => acc + e.sets.reduce((a, s) => a + draftMetric(s), 0),
    0,
  );
  const validatedSets = entries.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.validated).length,
    0,
  );

  // ----- save handler -----
  function handleSave() {
    if (entries.length === 0) {
      toast.error("Add at least one exercise before saving.");
      return;
    }

    for (const entry of entries) {
      const ex = exerciseMap.get(entry.exerciseId);
      if (!ex) {
        toast.error("One of your exercises could not be found. Remove it and re-add.");
        return;
      }
      if (entry.sets.length === 0) {
        toast.error(`"${ex.name}" has no sets. Add one or remove the entry.`);
        return;
      }
      for (const set of entry.sets) {
        const metric = ex.isStatic ? set.holdSeconds : set.reps;
        if (metric == null || Number.isNaN(metric)) {
          const label = ex.isStatic ? "hold (s)" : "reps";
          toast.error(
            `Every set on "${ex.name}" needs a ${label} value.`,
          );
          return;
        }
      }
    }

    // Build ISO date at local midnight
    const isoDate = new Date(`${date}T00:00:00`).toISOString();

    const payload: NewWorkoutPayload = {
      date: isoDate,
      title: title.trim() || undefined,
      durationMin:
        typeof durationMin === "number" && !Number.isNaN(durationMin)
          ? durationMin
          : undefined,
      perceivedExertion: exertion,
      bodyweightKg: bodyweight,
      notes: notes.trim() || undefined,
      entries: entries.map((e) => {
        const ex = exerciseMap.get(e.exerciseId)!;
        return {
          exerciseId: e.exerciseId,
          variantId: e.variantId,
          supersetGroup: e.supersetGroup,
          notes: e.notes.trim() || undefined,
          sets: e.sets.map((s) => ({
            reps: ex.isStatic ? undefined : s.reps,
            holdSeconds: ex.isStatic ? s.holdSeconds : undefined,
            weightKg: s.weightKg,
            rpe: s.rpe,
          })),
        };
      }),
    };

    createWorkout.mutate(payload, {
      onSuccess: () => {
        draft.resetDraft();
        useAppStore.getState().setView("history");
      },
    });
  }

  return (
    <div className="space-y-6 pb-28">
      <SectionHeading
        title="Log a workout"
        subtitle="Pick exercises, log sets, run rest timers, and save your session."
      />

      {/* ----------------------- Header card ----------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            Session details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nw-title">Title</Label>
              <Input
                id="nw-title"
                placeholder="Push & planche focus"
                value={title}
                onChange={(e) => draft.setMeta("title", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nw-date">Date</Label>
              <Input
                id="nw-date"
                type="date"
                value={date}
                onChange={(e) => draft.setMeta("date", e.target.value)}
                className="tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nw-duration">Duration (min)</Label>
              <Input
                id="nw-duration"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="45"
                value={durationMin}
                onChange={(e) =>
                  draft.setMeta(
                    "durationMin",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nw-bw">Bodyweight (kg)</Label>
              <Input
                id="nw-bw"
                type="number"
                inputMode="decimal"
                step={0.1}
                value={bodyweight}
                onChange={(e) =>
                  draft.setMeta(
                    "bodyweight",
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
                className="tabular-nums"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Perceived exertion</Label>
                <Badge
                  variant="outline"
                  className={cn("tabular-nums", exertionBadgeClass(exertion))}
                >
                  {exertion}/10
                </Badge>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[exertion]}
                onValueChange={(v) => draft.setMeta("exertion", v[0] ?? 5)}
                className={cn("mt-2", sliderAccentClass(exertion))}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>1 Easy</span>
                <span>5 Moderate</span>
                <span>10 Max</span>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nw-notes">Notes</Label>
              <Textarea
                id="nw-notes"
                placeholder="How did the session feel?"
                value={notes}
                onChange={(e) => draft.setMeta("notes", e.target.value)}
                rows={2}
              />
            </div>

            {/* Default rest duration */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5" />
                Default rest between sets
              </Label>
              <div className="flex flex-wrap gap-2">
                {REST_PRESETS.map((p) => (
                  <Button
                    key={p.sec}
                    type="button"
                    size="sm"
                    variant={defaultRestSec === p.sec ? "default" : "outline"}
                    className="h-8 tabular-nums"
                    onClick={() => draft.setMeta("defaultRestSec", p.sec)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------- Exercise picker trigger ----------------------- */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Exercises</h3>
          <p className="text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {validatedSets > 0 && (
              <span className="ml-2 text-emerald-500">
                · {validatedSets}/{totalSets} sets done
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setPickerOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Add Exercise
        </Button>
      </div>

      {/* ----------------------- Entries list ----------------------- */}
      {entries.length === 0 ? (
        <EmptyState
          icon={PlusCircle}
          title="No exercises yet"
          description="Add your first exercise to start logging sets. Tip: you can group exercises into supersets and run rest timers between sets."
          action={
            <Button onClick={() => setPickerOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              Add Exercise
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry, idx) => {
            const exercise = exerciseMap.get(entry.exerciseId);
            if (!exercise) return null;
            const prevEntry = idx > 0 ? entries[idx - 1] : null;
            const sameSupersetAsPrev =
              entry.supersetGroup != null &&
              prevEntry?.supersetGroup === entry.supersetGroup;
            return (
              <EntryCard
                key={entry.id}
                entry={entry}
                exercise={exercise}
                defaultRestSec={defaultRestSec}
                supersetCount={entries.filter(
                  (e) => e.supersetGroup === entry.supersetGroup,
                ).length}
                isFirstOfSuperset={
                  entry.supersetGroup != null &&
                  !sameSupersetAsPrev
                }
                canJoinPrevSuperset={prevEntry?.supersetGroup != null}
                onChange={(patch) => draft.updateEntry(entry.id, patch)}
                onRemove={() => draft.removeEntry(entry.id)}
                onAddSet={() => draft.addSet(entry.id)}
                onUpdateSet={(setId, patch) =>
                  draft.updateSet(entry.id, setId, patch)
                }
                onRemoveSet={(setId) => draft.removeSet(entry.id, setId)}
                onValidateSet={(setId, v) =>
                  draft.validateSet(entry.id, setId, v)
                }
                onToggleSuperset={() => {
                  if (entry.supersetGroup != null) {
                    // Already in a superset → leave it.
                    draft.setSuperset(entry.id, null);
                    return;
                  }
                  // Turning on: join the previous entry's superset if it has
                  // one (natural flow for back-to-back exercises), else start
                  // a new group.
                  const prevGroup = prevEntry?.supersetGroup;
                  if (prevGroup != null) {
                    draft.setSuperset(entry.id, prevGroup);
                  } else {
                    draft.setSuperset(entry.id, nextSupersetGroup(entries));
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* ----------------------- Sticky save bar ----------------------- */}
      <div className="sticky bottom-4 z-30">
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/80 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <div className="flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium tabular-nums">{entries.length}</span>
              <span className="text-muted-foreground">entries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium tabular-nums">{totalSets}</span>
              <span className="text-muted-foreground">sets</span>
            </div>
            {validatedSets > 0 && (
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="font-medium tabular-nums text-emerald-500">
                  {validatedSets}
                </span>
                <span className="text-muted-foreground">done</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium tabular-nums">
                {fmtCompact(totalVolume)}
              </span>
              <span className="text-muted-foreground">total volume</span>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={createWorkout.isPending}
            className="sm:min-w-44"
          >
            {createWorkout.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Workout
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ----------------------- Exercise picker dialog ----------------------- */}
      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={exercises}
        onPick={addEntry}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EntryCard — one exercise with its sets
// ---------------------------------------------------------------------------
function EntryCard({
  entry,
  exercise,
  defaultRestSec,
  supersetCount,
  isFirstOfSuperset,
  canJoinPrevSuperset,
  onChange,
  onRemove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onValidateSet,
  onToggleSuperset,
}: {
  entry: DraftEntry;
  exercise: ExerciseWithVariants;
  defaultRestSec: number;
  supersetCount: number;
  isFirstOfSuperset: boolean;
  canJoinPrevSuperset: boolean;
  onChange: (patch: Partial<DraftEntry>) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, patch: Partial<DraftSet>) => void;
  onRemoveSet: (setId: string) => void;
  onValidateSet: (setId: string, validated: boolean) => void;
  onToggleSuperset: () => void;
}) {
  const { variantId, notes, sets, supersetGroup } = entry;
  const cat = exercise.category as ExerciseCategory;
  const meta = CATEGORY_META[cat] ?? {
    label: cat,
    color: "#9ca3af",
    emoji: "•",
  };
  const isStatic = exercise.isStatic;
  const metricLabel = isStatic ? "Hold (s)" : "Reps";

  const totalSetsCount = sets.length;
  const totalVolume = sets.reduce((a, s) => a + draftMetric(s), 0);
  const bestSet = sets.reduce((m, s) => Math.max(m, draftMetric(s)), 0);
  const validatedCount = sets.filter((s) => s.validated).length;

  const sortedVariants = exercise.variants
    ? exercise.variants.slice().sort((a, b) => a.difficultyLevel - b.difficultyLevel)
    : [];

  const ssColor = supersetColor(supersetGroup);
  const ssLabel = supersetLabel(supersetGroup);
  const inSuperset = supersetGroup != null;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow",
        inSuperset && "shadow-sm",
      )}
      style={
        inSuperset && ssColor
          ? { borderLeftColor: ssColor, borderLeftWidth: 4 }
          : undefined
      }
    >
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span aria-hidden className="text-base leading-none">
              {meta.emoji}
            </span>
            <CardTitle className="truncate text-base">
              {exercise.name}
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
                Hold
              </Badge>
            )}
            {inSuperset && ssColor && ssLabel && (
              <Badge
                variant="outline"
                className="gap-1 border-transparent text-[10px] font-bold"
                style={{ backgroundColor: `${ssColor}22`, color: ssColor }}
                title={`Superset ${ssLabel} · ${supersetCount} exercise${supersetCount > 1 ? "s" : ""}`}
              >
                <Link2 className="h-3 w-3" />
                Superset {ssLabel}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={variantId ?? "__none__"}
              onValueChange={(v) =>
                onChange({ variantId: v === "__none__" ? null : v })
              }
            >
              <SelectTrigger size="sm" className="h-8 w-40">
                <SelectValue placeholder="Standard / None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Standard / None</SelectItem>
                {sortedVariants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      · Lv {v.difficultyLevel}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8",
                inSuperset
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary",
              )}
              onClick={onToggleSuperset}
              aria-label={
                inSuperset
                  ? "Remove from superset"
                  : canJoinPrevSuperset
                    ? "Join previous superset"
                    : "Start a new superset here"
              }
              title={
                inSuperset
                  ? "Remove from superset"
                  : canJoinPrevSuperset
                    ? "Join the previous exercise's superset"
                    : "Start a new superset"
              }
            >
              {inSuperset ? (
                <Link2Off className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onRemove}
              aria-label={`Remove ${exercise.name}`}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Superset hint when first of a group */}
        {isFirstOfSuperset && supersetCount > 1 && ssColor && (
          <p
            className="text-xs font-medium"
            style={{ color: ssColor }}
          >
            ↳ Superset {ssLabel}: perform the next{" "}
            {supersetCount - 1} exercise{supersetCount - 1 > 1 ? "s" : ""} back-to-back without rest.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Input
          placeholder="Form cues..."
          value={notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="h-8"
          aria-label={`Notes for ${exercise.name}`}
        />

        {/* Desktop: inline table */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="w-10 pb-2 text-left font-medium">Set</th>
                <th className="pb-2 text-left font-medium">{metricLabel}</th>
                <th className="pb-2 text-left font-medium">Weight (kg)</th>
                <th className="pb-2 text-left font-medium">RPE</th>
                <th className="w-20 pb-2 text-center font-medium">Done</th>
                <th className="w-24 pb-2 text-right font-medium">Rest</th>
                <th className="w-10 pb-2" />
              </tr>
            </thead>
            <tbody>
              {sets.map((set, idx) => (
                <SetRowDesktop
                  key={set.id}
                  set={set}
                  idx={idx}
                  isStatic={isStatic}
                  metricLabel={metricLabel}
                  defaultRestSec={defaultRestSec}
                  onUpdate={(patch) => onUpdateSet(set.id, patch)}
                  onRemove={() => onRemoveSet(set.id)}
                  onValidate={(v) => onValidateSet(set.id, v)}
                />
              ))}
              {sets.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-3 text-center text-xs text-muted-foreground"
                  >
                    No sets yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="space-y-2 sm:hidden">
          {sets.map((set, idx) => (
            <SetRowMobile
              key={set.id}
              set={set}
              idx={idx}
              isStatic={isStatic}
              metricLabel={metricLabel}
              defaultRestSec={defaultRestSec}
              onUpdate={(patch) => onUpdateSet(set.id, patch)}
              onRemove={() => onRemoveSet(set.id)}
              onValidate={(v) => onValidateSet(set.id, v)}
            />
          ))}
          {sets.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No sets yet — add one below.
            </p>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={onAddSet}>
          <Plus className="h-4 w-4" />
          Add Set
        </Button>

        <Separator />

        {/* Per-entry summary */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground tabular-nums">
              {totalSetsCount}
            </span>{" "}
            sets
          </span>
          <span>
            Volume{" "}
            <span className="font-medium text-foreground tabular-nums">
              {fmtCompact(totalVolume)}
            </span>{" "}
            {metricUnit(isStatic)}
          </span>
          <span>
            Best{" "}
            <span className="font-medium text-foreground tabular-nums">
              {fmtCompact(bestSet)}
            </span>{" "}
            {metricUnit(isStatic)}
          </span>
          {validatedCount > 0 && (
            <span className="text-emerald-500">
              <span className="font-medium tabular-nums">{validatedCount}</span> validated
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Set rows
// ---------------------------------------------------------------------------

function ValidateButton({
  validated,
  onClick,
  label,
}: {
  validated: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={validated}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all",
        validated
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
          : "border-border bg-muted/30 text-muted-foreground hover:border-emerald-500/60 hover:text-emerald-500",
      )}
    >
      <Check className={cn("h-4 w-4", validated && "scale-110")} />
    </button>
  );
}

function RestButton({
  defaultRestSec,
  validated,
}: {
  defaultRestSec: number;
  validated: boolean;
}) {
  const start = useTimerStore((s) => s.start);
  const [open, setOpen] = React.useState(false);

  // When the popover is open we show preset buttons; otherwise the main
  // button starts the default rest timer directly.
  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant={validated ? "secondary" : "outline"}
        className={cn(
          "h-8 gap-1.5",
          validated && "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400",
        )}
        onClick={() => start(defaultRestSec)}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        title="Click to start rest · Right-click for presets"
      >
        <Coffee className="h-3.5 w-3.5" />
        <span className="tabular-nums">{defaultRestSec}s</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
      {REST_PRESETS.map((p) => (
        <Button
          key={p.sec}
          type="button"
          size="sm"
          variant={p.sec === defaultRestSec ? "default" : "ghost"}
          className="h-7 tabular-nums"
          onClick={() => {
            start(p.sec);
            setOpen(false);
          }}
        >
          {p.label}
        </Button>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => setOpen(false)}
      >
        ✕
      </Button>
    </div>
  );
}

function SetRowDesktop({
  set,
  idx,
  isStatic,
  metricLabel,
  defaultRestSec,
  onUpdate,
  onRemove,
  onValidate,
}: {
  set: DraftSet;
  idx: number;
  isStatic: boolean;
  metricLabel: string;
  defaultRestSec: number;
  onUpdate: (patch: Partial<DraftSet>) => void;
  onRemove: () => void;
  onValidate: (validated: boolean) => void;
}) {
  const validated = set.validated;
  return (
    <tr
      className={cn(
        "border-t border-border/50 transition-colors",
        validated && "bg-emerald-500/8",
      )}
    >
      <td className="py-2 text-muted-foreground tabular-nums">{idx + 1}</td>
      <td className="py-2 pr-2">
        <NumberInput
          value={isStatic ? set.holdSeconds : set.reps}
          placeholder={isStatic ? "30" : "8"}
          aria-label={`${metricLabel} for set ${idx + 1}`}
          onChange={(n) =>
            onUpdate(isStatic ? { holdSeconds: n } : { reps: n })
          }
        />
      </td>
      <td className="py-2 pr-2">
        <NumberInput
          value={set.weightKg}
          placeholder="0"
          step={0.5}
          aria-label={`Weight for set ${idx + 1}`}
          onChange={(n) => onUpdate({ weightKg: n })}
        />
      </td>
      <td className="py-2 pr-2">
        <NumberInput
          value={set.rpe}
          placeholder="7"
          min={1}
          max={10}
          aria-label={`RPE for set ${idx + 1}`}
          onChange={(n) => onUpdate({ rpe: n })}
        />
      </td>
      <td className="py-2 text-center">
        <ValidateButton
          validated={validated}
          onClick={() => onValidate(!validated)}
          label={`Mark set ${idx + 1} as ${validated ? "not done" : "done"}`}
        />
      </td>
      <td className="py-2 text-right">
        <RestButton defaultRestSec={defaultRestSec} validated={validated} />
      </td>
      <td className="py-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Delete set ${idx + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

function SetRowMobile({
  set,
  idx,
  isStatic,
  metricLabel,
  defaultRestSec,
  onUpdate,
  onRemove,
  onValidate,
}: {
  set: DraftSet;
  idx: number;
  isStatic: boolean;
  metricLabel: string;
  defaultRestSec: number;
  onUpdate: (patch: Partial<DraftSet>) => void;
  onRemove: () => void;
  onValidate: (validated: boolean) => void;
}) {
  const validated = set.validated;
  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-muted/20 p-3 transition-colors",
        validated
          ? "border-emerald-500/60 bg-emerald-500/10"
          : "border-border/60",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
          Set {idx + 1}
        </span>
        <div className="flex items-center gap-1">
          <ValidateButton
            validated={validated}
            onClick={() => onValidate(!validated)}
            label={`Mark set ${idx + 1} as ${validated ? "not done" : "done"}`}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={`Delete set ${idx + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <LabeledNumber
          label={metricLabel}
          value={isStatic ? set.holdSeconds : set.reps}
          placeholder={isStatic ? "30" : "8"}
          onChange={(n) =>
            onUpdate(isStatic ? { holdSeconds: n } : { reps: n })
          }
        />
        <LabeledNumber
          label="Weight (kg)"
          value={set.weightKg}
          placeholder="0"
          step={0.5}
          onChange={(n) => onUpdate({ weightKg: n })}
        />
        <LabeledNumber
          label="RPE"
          value={set.rpe}
          placeholder="7"
          min={1}
          max={10}
          onChange={(n) => onUpdate({ rpe: n })}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <RestButton defaultRestSec={defaultRestSec} validated={validated} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small numeric input primitives
// ---------------------------------------------------------------------------
function NumberInput({
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
  "aria-label": ariaLabel,
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  "aria-label"?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") {
          onChange(undefined);
          return;
        }
        const n = Number(v);
        if (Number.isNaN(n)) {
          onChange(undefined);
          return;
        }
        onChange(n);
      }}
      className="h-9 w-16 tabular-nums"
      aria-label={ariaLabel}
    />
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            onChange(undefined);
            return;
          }
          const n = Number(v);
          if (Number.isNaN(n)) {
            onChange(undefined);
            return;
          }
          onChange(n);
        }}
        className="h-9 tabular-nums"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise picker dialog (Command list grouped by category)
// ---------------------------------------------------------------------------
function ExercisePickerDialog({
  open,
  onOpenChange,
  exercises,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exercises: ExerciseWithVariants[];
  onPick: (e: ExerciseWithVariants) => void;
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<ExerciseCategory, ExerciseWithVariants[]>();
    for (const ex of exercises) {
      const cat = ex.category as ExerciseCategory;
      const arr = map.get(cat) ?? [];
      arr.push(ex);
      map.set(cat, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [exercises]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add an exercise"
      description="Search and pick an exercise to add to your workout."
      className="sm:max-w-md"
    >
      <Command>
        <CommandInput placeholder="Search exercises..." />
        <CommandList>
          <CommandEmpty>No exercise found.</CommandEmpty>
          {grouped.map(([cat, list]) => {
            const meta = CATEGORY_META[cat] ?? {
              label: cat,
              color: "#9ca3af",
              emoji: "•",
            };
            return (
              <CommandGroup
                key={cat}
                heading={`${meta.emoji} ${meta.label}`}
              >
                {list.map((ex) => (
                  <CommandItem
                    key={ex.id}
                    value={`${ex.name} ${cat} ${ex.muscleGroup}`}
                    onSelect={() => onPick(ex)}
                  >
                    <span aria-hidden className="text-base leading-none">
                      {meta.emoji}
                    </span>
                    <span className="flex-1 truncate">{ex.name}</span>
                    {ex.isStatic && (
                      <Badge variant="secondary" className="text-[10px]">
                        Hold
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
