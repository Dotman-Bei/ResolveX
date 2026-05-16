"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Market } from "@/lib/genlayer";
import { OddsBar } from "./OddsBar";
import { Countdown } from "./Countdown";
import { formatGen } from "@/lib/utils";
import { Clock, CheckCircle2, Activity, ArrowUpRight, Zap } from "lucide-react";

const categoryColor: Record<string, string> = {
  crypto: "text-accent",
  sports: "text-info",
  politics: "text-warning",
  entertainment: "text-no",
  tech: "text-yes",
  world: "text-fg-muted",
};

export function MarketCard({ m, index = 0 }: { m: Market; index?: number }) {
  const totalPool = (m.totalYes + m.totalNo) / 1e18;
  const past = new Date(m.resolutionDate).getTime() < Date.now();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
    >
      <Link
        href={`/markets/${m.id}`}
        className="card card-hover p-5 flex flex-col gap-4 group relative overflow-hidden"
      >
        {/* Hover halo */}
        <span className="pointer-events-none absolute -top-24 -right-24 size-48 rounded-full bg-accent/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="flex items-start justify-between gap-3">
          <span
            className={`chip uppercase tracking-[0.14em] ${categoryColor[m.category] ?? ""}`}
          >
            {m.category}
          </span>
          {m.resolved ? (
            <span className="chip-yes">
              <CheckCircle2 className="size-3" /> {m.outcome}
            </span>
          ) : past ? (
            <span className="chip-accent">
              <Zap className="size-3" /> Ready to resolve
            </span>
          ) : (
            <span className="chip">
              <Clock className="size-3" />
              <Countdown
                target={m.resolutionDate}
                doneLabel={
                  <span className="chip-accent">
                    <Zap className="size-3" /> Ready
                  </span>
                }
              />
            </span>
          )}
        </div>

        <h3 className="text-[15px] font-medium leading-snug text-balance group-hover:text-accent transition-colors duration-300 line-clamp-3 min-h-[3.6rem]">
          {m.question}
        </h3>

        <OddsBar yes={m.totalYes} no={m.totalNo} />

        <div className="flex items-center justify-between text-[11px] text-fg-dim pt-1 border-t border-border/60">
          <span>
            Pool · <span className="num text-fg-muted">{totalPool.toFixed(2)} GEN</span>
          </span>
          <span className="flex items-center gap-1 group-hover:text-accent transition-colors">
            <span className="num">{m.bets.length} bets</span>
            <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
