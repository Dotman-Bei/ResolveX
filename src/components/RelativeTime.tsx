"use client";

import { useEffect, useState } from "react";
import { timeUntil } from "@/lib/utils";

function fallbackDate(iso: string) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "Date TBD";
  return new Date(time).toISOString().slice(0, 10);
}

export function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => fallbackDate(iso));

  useEffect(() => {
    const update = () => setLabel(timeUntil(iso));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [iso]);

  return <>{label}</>;
}

export function RelativeResolutionLabel({
  iso,
  readyLabel = "Ready to resolve",
}: {
  iso: string;
  readyLabel?: string;
}) {
  const [label, setLabel] = useState(() => fallbackDate(iso));

  useEffect(() => {
    const update = () => {
      const next = timeUntil(iso);
      setLabel(next === "Resolved-ready" ? readyLabel : next);
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [iso, readyLabel]);

  return <>{label}</>;
}

export function useDueForResolution(iso: string, resolved: boolean) {
  const [due, setDue] = useState(false);

  useEffect(() => {
    const update = () => {
      setDue(!resolved && new Date(iso).getTime() < Date.now());
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [iso, resolved]);

  return due;
}
