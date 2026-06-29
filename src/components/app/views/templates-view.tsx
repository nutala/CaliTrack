"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  FileText,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import { useTemplates, useDeleteTemplate } from "@/hooks/use-data";
import { useAppStore } from "@/lib/store";
import { useDraftStore } from "@/lib/draft-store";
import { useExercises } from "@/hooks/use-data";
import type { ExerciseWithVariants } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/common";

export function TemplatesView() {
  const { data: templates, isLoading } = useTemplates();
  const { data: exercises } = useExercises();
  const deleteTemplate = useDeleteTemplate();
  const { viewTemplateEditor, setView } = useAppStore();
  const draft = useDraftStore();

  const exerciseMap = React.useMemo(() => {
    const m = new Map<string, ExerciseWithVariants>();
    for (const ex of exercises ?? []) m.set(ex.id, ex);
    return m;
  }, [exercises]);

  function handleUseTemplate(tpl: NonNullable<typeof templates>[number]) {
    draft.loadFromTemplate(tpl as Parameters<typeof draft.loadFromTemplate>[0], exerciseMap);
    setView("new-workout");
    toast.success(`Template « ${tpl.name} » chargé`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Prépare tes séances à l&apos;avance
          </p>
        </div>
        <Button onClick={() => viewTemplateEditor()}>
          <Plus className="h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Chargement…
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun template"
          description="Crée ton premier template pour gagner du temps quand tu lances une séance."
          action={
            <Button onClick={() => viewTemplateEditor()}>
              <Plus className="h-4 w-4" />
              Nouveau template
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    {tpl.notes && (
                      <CardDescription className="mt-0.5 line-clamp-1">
                        {tpl.notes}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUseTemplate(tpl)}
                      className="gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Utiliser
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => viewTemplateEditor(tpl.id)}
                      className="text-muted-foreground"
                    >
                      Modifier
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Supprimer le template « ${tpl.name} » ?`,
                          )
                        )
                          return;
                        await deleteTemplate.mutateAsync(tpl.id);
                      }}
                      aria-label={`Supprimer ${tpl.name}`}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {tpl.entries.map((e) => (
                    <Badge
                      key={e.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {e.exercise.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
