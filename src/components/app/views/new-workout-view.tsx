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
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  type ExerciseWithVariants,
  type ExerciseCategory,
  CATEGORY_META,
} from "@/lib/types";
import { metricUnit, setMetric, fmtCompact } from "@/lib/calc";
import {
  useExercises,
  useCreateWorkout,
  type NewWorkoutPayload,
} from "@/hooks/use-data";
import { useAppStore } from "@/lib/store";
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
// Local draft types — transient, never persisted
// ---------------------------------------------------------------------------
type DraftSet = {
  id: string;
  reps?: number;
  holdSeconds?: number;
  weightKg?: number;
  rpe?: number;
};

type DraftEntry = {
  id: string;
  exercise: ExerciseWithVariants;
  variantId: string | null;
  notes: string;
  sets: DraftSet[];
};

/** Stable, dependency-free unique id. */
function uid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

/** Adapter so `setMetric` (which expects the Prisma nullable shape) can read a DraftSet. */
function draftMetric(set: DraftSet): number {
  return setMetric({
    reps: set.reps ?? null,
    holdSeconds: set.holdSeconds ?? null,
  });
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
  // Workout metadata
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [durationMin, setDurationMin] = React.useState<number | "">("");
  const [exertion, setExertion] = React.useState<number>(5);
  const [bodyweight, setBodyweight] = React.useState<number>(72);
  const [notes, setNotes] = React.useState("");

  // Entries draft
  const [entries, setEntries] = React.useState<DraftEntry[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Data
  const exercisesQ = useExercises();
  const exercises = exercisesQ.data ?? [];
  const createWorkout = useCreateWorkout();

  // ----- mutations on draft -----
  function addEntry(exercise: ExerciseWithVariants) {
    const entry: DraftEntry = {
      id: uid(),
      exercise,
      variantId: null,
      notes: "",
      sets: [{ id: uid() }],
    };
    setEntries((prev) => [...prev, entry]);
    setPickerOpen(false);
  }

  function removeEntry(entryId: string) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  function updateEntry(entryId: string, patch: Partial<DraftEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    );
  }

  function addSet(entryId: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, sets: [...e.sets, { id: uid() }] }
          : e,
      ),
    );
  }

  function updateSet(
    entryId: string,
    setId: string,
    patch: Partial<DraftSet>,
  ) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, ...patch } : s,
              ),
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

  function resetDraft() {
    setTitle("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setDurationMin("");
    setExertion(5);
    setBodyweight(72);
    setNotes("");
    setEntries([]);
  }

  // ----- derived totals for the sticky bar -----
  const totalSets = entries.reduce((acc, e) => acc + e.sets.length, 0);
  const totalVolume = entries.reduce(
    (acc, e) => acc + e.sets.reduce((a, s) => a + draftMetric(s), 0),
    0,
  );

  // ----- save handler -----
  function handleSave() {
    if (entries.length === 0) {
      toast.error("Add at least one exercise before saving.");
      return;
    }

    for (const entry of entries) {
      if (entry.sets.length === 0) {
        toast.error(`"${entry.exercise.name}" has no sets. Add one or remove the entry.`);
        return;
      }
      for (const set of entry.sets) {
        const metric =
          entry.exercise.isStatic ? set.holdSeconds : set.reps;
        if (metric == null || Number.isNaN(metric)) {
          const label = entry.exercise.isStatic ? "hold (s)" : "reps";
          toast.error(
            `Every set on "${entry.exercise.name}" needs a ${label} value.`,
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
      entries: entries.map((e) => ({
        exerciseId: e.exercise.id,
        variantId: e.variantId,
        notes: e.notes.trim() || undefined,
        sets: e.sets.map((s) => ({
          reps: e.exercise.isStatic ? undefined : s.reps,
          holdSeconds: e.exercise.isStatic ? s.holdSeconds : undefined,
          weightKg: s.weightKg,
          rpe: s.rpe,
        })),
      })),
    };

    createWorkout.mutate(payload, {
      onSuccess: () => {
        resetDraft();
        useAppStore.getState().setView("history");
      },
    });
  }

  return (
    <div className="space-y-6 pb-28">
      <SectionHeading
        title="Log a workout"
        subtitle="Pick exercises, log sets, and save your session."
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
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nw-date">Date</Label>
              <Input
                id="nw-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                  setDurationMin(
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
                  setBodyweight(
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
                onValueChange={(v) => setExertion(v[0] ?? 5)}
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
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
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
          description="Add your first exercise to start logging sets."
          action={
            <Button onClick={() => setPickerOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              Add Exercise
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onChange={(patch) => updateEntry(entry.id, patch)}
              onRemove={() => removeEntry(entry.id)}
              onAddSet={() => addSet(entry.id)}
              onUpdateSet={(setId, patch) =>
                updateSet(entry.id, setId, patch)
              }
              onRemoveSet={(setId) => removeSet(entry.id, setId)}
            />
          ))}
        </div>
      )}

      {/* ----------------------- Sticky save bar ----------------------- */}
      <div className="sticky bottom-4 z-30">
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/80 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <div className="flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium tabular-nums">
                {entries.length}
              </span>
              <span className="text-muted-foreground">entries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium tabular-nums">{totalSets}</span>
              <span className="text-muted-foreground">sets</span>
            </div>
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
  onChange,
  onRemove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: {
  entry: DraftEntry;
  onChange: (patch: Partial<DraftEntry>) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, patch: Partial<DraftSet>) => void;
  onRemoveSet: (setId: string) => void;
}) {
  const { exercise, variantId, notes, sets } = entry;
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
  const bestSet = sets.reduce(
    (m, s) => Math.max(m, draftMetric(s)),
    0,
  );

  const sortedVariants = exercise.variants
    ? exercise.variants
        .slice()
        .sort((a, b) => a.difficultyLevel - b.difficultyLevel)
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
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
              onClick={onRemove}
              aria-label={`Remove ${exercise.name}`}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
                <th className="w-10 pb-2" />
              </tr>
            </thead>
            <tbody>
              {sets.map((set, idx) => (
                <tr key={set.id} className="border-t border-border/50">
                  <td className="py-2 text-muted-foreground tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-2 pr-2">
                    <NumberInput
                      value={isStatic ? set.holdSeconds : set.reps}
                      placeholder={isStatic ? "30" : "8"}
                      aria-label={`${metricLabel} for set ${idx + 1}`}
                      onChange={(n) =>
                        onUpdateSet(
                          set.id,
                          isStatic ? { holdSeconds: n } : { reps: n },
                        )
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <NumberInput
                      value={set.weightKg}
                      placeholder="0"
                      step={0.5}
                      aria-label={`Weight for set ${idx + 1}`}
                      onChange={(n) =>
                        onUpdateSet(set.id, { weightKg: n })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <NumberInput
                      value={set.rpe}
                      placeholder="7"
                      min={1}
                      max={10}
                      aria-label={`RPE for set ${idx + 1}`}
                      onChange={(n) => onUpdateSet(set.id, { rpe: n })}
                    />
                  </td>
                  <td className="py-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveSet(set.id)}
                      aria-label={`Delete set ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {sets.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
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
            <div
              key={set.id}
              className="rounded-lg border border-border/60 bg-muted/20 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
                  Set {idx + 1}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveSet(set.id)}
                  aria-label={`Delete set ${idx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <LabeledNumber
                  label={metricLabel}
                  value={isStatic ? set.holdSeconds : set.reps}
                  placeholder={isStatic ? "30" : "8"}
                  onChange={(n) =>
                    onUpdateSet(
                      set.id,
                      isStatic ? { holdSeconds: n } : { reps: n },
                    )
                  }
                />
                <LabeledNumber
                  label="Weight (kg)"
                  value={set.weightKg}
                  placeholder="0"
                  step={0.5}
                  onChange={(n) => onUpdateSet(set.id, { weightKg: n })}
                />
                <LabeledNumber
                  label="RPE"
                  value={set.rpe}
                  placeholder="7"
                  min={1}
                  max={10}
                  onChange={(n) => onUpdateSet(set.id, { rpe: n })}
                />
              </div>
            </div>
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
        </div>
      </CardContent>
    </Card>
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
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                      >
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
