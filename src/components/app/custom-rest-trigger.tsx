"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { useTimerStore } from "@/lib/timer-store";
import { useDraftStore } from "@/lib/draft-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function toMmSs(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseMmSs(value: string): number | null {
  const cleaned = value.replace(/[^0-9:]/g, "");
  const parts = cleaned.split(":");
  if (parts.length === 2) {
    const mm = parseInt(parts[0], 10);
    const ss = parseInt(parts[1], 10);
    if (!isNaN(mm) && !isNaN(ss) && ss < 60) return mm * 60 + ss;
  }
  if (parts.length === 1) {
    const sec = parseInt(parts[0], 10);
    if (!isNaN(sec)) return sec;
  }
  return null;
}

export function CustomRestTrigger() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");

  const sessionActive = useDraftStore((s) => s.sessionStartedAt != null);
  const lastCustom = useTimerStore((s) => s.lastCustomRestSec);
  const start = useTimerStore((s) => s.start);
  const setLastCustomRestSec = useTimerStore((s) => s.setLastCustomRestSec);

  React.useEffect(() => {
    if (open) {
      setInput(toMmSs(lastCustom));
    }
  }, [open, lastCustom]);

  function handleSubmit() {
    const sec = parseMmSs(input);
    if (sec == null || sec <= 0) return;
    setLastCustomRestSec(sec);
    start(sec);
    setOpen(false);
  }

  if (!sessionActive) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
        aria-label="Lancer un repos personnalisé"
      >
        <Timer className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-72">
          <DialogHeader>
            <DialogTitle>Temps de repos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="01:30"
              className="text-center text-lg tabular-nums"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
            <p className="text-center text-xs text-muted-foreground">
              Format mm:ss
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} className="w-full">
              Lancer le repos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
