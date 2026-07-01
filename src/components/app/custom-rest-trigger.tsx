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

/** Auto-format raw keystrokes into mm:ss display. */
function formatInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "00:00";
  const padded = digits.padStart(3, "0");
  const mm = padded.slice(0, -2);
  const ss = padded.slice(-2);
  return `${mm.padStart(2, "0")}:${ss}`;
}

function parseMmSs(value: string): number | null {
  const cleaned = value.replace(/[^0-9:]/g, "");
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    const mm = parseInt(parts[0], 10);
    const ss = parseInt(parts[1], 10);
    if (!isNaN(mm) && !isNaN(ss) && ss < 60) return mm * 60 + ss;
    return null;
  }
  // Pure digits — interpret as mmss (last 2 = seconds, rest = minutes)
  if (cleaned.length < 2) {
    const sec = parseInt(cleaned, 10);
    return !isNaN(sec) ? sec : null;
  }
  const mm = parseInt(cleaned.slice(0, -2), 10);
  const ss = parseInt(cleaned.slice(-2), 10);
  if (!isNaN(mm) && !isNaN(ss) && ss < 60) return mm * 60 + ss;
  return parseInt(cleaned, 10) || null;
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
              onChange={(e) => setInput(formatInput(e.target.value))}
              placeholder="01:30"
              className="text-center text-lg tabular-nums"
              inputMode="numeric"
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
