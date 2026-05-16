"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function OddsBar({
  yes,
  no,
  className,
  size = "md",
}: {
  yes: number;
  no: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const total = yes + no;
  const yesPct = total === 0 ? 50 : (yes / total) * 100;
  const noPct = 100 - yesPct;
  const h = size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between text-[11px] num mb-1.5">
        <span className="flex items-center gap-1.5 text-yes">
          <span className="size-1.5 rounded-full bg-yes" />
          YES {yesPct.toFixed(0)}%
        </span>
        <span className="flex items-center gap-1.5 text-no">
          {noPct.toFixed(0)}% NO
          <span className="size-1.5 rounded-full bg-no" />
        </span>
      </div>
      <div className={cn("w-full rounded-full bg-bg-elevated overflow-hidden flex", h)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${yesPct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-gradient-to-r from-yes/70 to-yes"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${noPct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="h-full bg-gradient-to-l from-no/70 to-no"
        />
      </div>
    </div>
  );
}
