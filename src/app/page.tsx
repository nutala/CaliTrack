"use client";

import * as React from "react";
import { AppShell } from "@/components/app/app-shell";
import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/app/views/dashboard-view";
import { ExercisesView } from "@/components/app/views/exercises-view";
import { NewWorkoutView } from "@/components/app/views/new-workout-view";
import { HistoryView } from "@/components/app/views/history-view";
import { StatsView } from "@/components/app/views/stats-view";

export default function Home() {
  const view = useAppStore((s) => s.view);

  return (
    <AppShell>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            Loading…
          </div>
        }
      >
        <ViewRouter view={view} />
      </React.Suspense>
    </AppShell>
  );
}

function ViewRouter({ view }: { view: ReturnType<typeof useAppStore.getState>["view"] }) {
  switch (view) {
    case "dashboard":
      return <DashboardView />;
    case "exercises":
      return <ExercisesView />;
    case "new-workout":
      return <NewWorkoutView />;
    case "history":
      return <HistoryView />;
    case "stats":
      return <StatsView />;
    default:
      return <DashboardView />;
  }
}
