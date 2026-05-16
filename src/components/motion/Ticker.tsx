"use client";
import { ReactNode } from "react";

export function Ticker({ children, speed = 60 }: { children: ReactNode; speed?: number }) {
  return (
    <div className="relative overflow-hidden">
      <div
        className="flex w-max animate-[ticker_linear_infinite] gap-12 whitespace-nowrap"
        style={{ animationDuration: `${speed}s` }}
      >
        <div className="flex gap-12 items-center">{children}</div>
        <div className="flex gap-12 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg to-transparent" />
    </div>
  );
}
