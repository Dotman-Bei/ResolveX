"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownProps {
  target: string | number | Date;
  /** What to render once the countdown crosses zero. */
  doneLabel?: React.ReactNode;
  className?: string;
}

function getRemaining(target: number) {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return {
    d: Math.floor(s / 86_400),
    h: Math.floor((s % 86_400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function format(r: ReturnType<typeof getRemaining>) {
  if (!r) return "00s";
  if (r.d > 0) return `${r.d}d ${r.h}h ${r.m}m`;
  if (r.h > 0) return `${r.h}h ${String(r.m).padStart(2, "0")}m ${String(r.s).padStart(2, "0")}s`;
  return `${String(r.m).padStart(2, "0")}m ${String(r.s).padStart(2, "0")}s`;
}

export function Countdown({ target, doneLabel, className }: CountdownProps) {
  const targetMs =
    typeof target === "number" ? target : new Date(target).getTime();
  const [remaining, setRemaining] = useState(() => getRemaining(targetMs));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRemaining(getRemaining(targetMs));
    // Tick every second when within 24h; every minute otherwise to save renders.
    const tick = () => setRemaining(getRemaining(targetMs));
    const within24h = targetMs - Date.now() < 24 * 3600 * 1000;
    const interval = within24h ? 1000 : 60_000;
    const id = window.setInterval(tick, interval);
    return () => window.clearInterval(id);
  }, [targetMs]);

  if (!mounted) {
    // Server-render a stable placeholder so hydration matches; client takes over.
    return <span className={cn("num tabular-nums", className)}>—</span>;
  }

  if (!remaining) {
    return <>{doneLabel ?? <span className={cn("num", className)}>00s</span>}</>;
  }

  return (
    <span className={cn("num tabular-nums", className)}>{format(remaining)}</span>
  );
}
