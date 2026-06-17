"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Dumbbell,
  PlusCircle,
  History,
  BarChart3,
  Activity,
} from "lucide-react";
import { useAppStore, type ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { RestTimerWidget } from "@/components/app/rest-timer-widget";
import { Button } from "@/components/ui/button";

const NAV: { id: ViewId; label: string; icon: React.ComponentType<{ className?: string }>; short: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, short: "Home" },
  { id: "exercises", label: "Exercises", icon: Dumbbell, short: "Exos" },
  { id: "new-workout", label: "New Workout", icon: PlusCircle, short: "Log" },
  { id: "history", label: "History", icon: History, short: "Past" },
  { id: "stats", label: "Stats", icon: BarChart3, short: "Stats" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            onClick={() => setView("dashboard")}
            className="flex items-center gap-2.5 group"
            aria-label="Go to dashboard"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-base font-bold tracking-tight">
                CalisTrack
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Calisthenics
              </span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {NAV.map((item) => {
              const active = view === item.id;
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView(item.id)}
                  className={cn(
                    "gap-2 font-medium",
                    active && "shadow-sm",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => setView("new-workout")}
              className="hidden sm:inline-flex gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Log Workout
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile nav (scrollable pill bar) */}
        <nav
          className="md:hidden flex items-center gap-1 overflow-x-auto px-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Mobile"
        >
          {NAV.map((item) => {
            const active = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border/60 bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span className="font-medium">CalisTrack</span>
              <span className="opacity-60">·</span>
              <span>Calisthenics Performance Tracker</span>
            </p>
            <p className="opacity-70">
              Built for athletes chasing the full planche. 💪
            </p>
          </div>
        </div>
      </footer>

      {/* Floating rest timer (persists across views) */}
      <RestTimerWidget />
    </div>
  );
}
