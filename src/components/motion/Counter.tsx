"use client";
import {
  useMotionValue,
  useTransform,
  animate,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface CounterProps {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function Counter({
  to,
  from = 0,
  duration = 1.4,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReduced = useReducedMotion();
  const mv = useMotionValue(from);
  const display = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);
  const [text, setText] = useState(`${prefix}${from.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    const unsub = display.on("change", setText);
    return unsub;
  }, [display]);

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, to, duration, mv, prefersReduced]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
