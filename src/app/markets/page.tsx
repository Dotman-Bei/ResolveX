"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Category, useGenLayer } from "@/lib/genlayer";
import { MarketCard } from "@/components/MarketCard";
import { Reveal } from "@/components/motion/Reveal";
import { CheckCircle2, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const CATS: { key: Category | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "crypto", label: "Crypto" },
  { key: "sports", label: "Sports" },
  { key: "politics", label: "Politics" },
  { key: "entertainment", label: "Culture" },
  { key: "tech", label: "Tech" },
  { key: "world", label: "World" },
];

const STATUSES = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
] as const;

export default function MarketsPage() {
  const { markets } = useGenLayer();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [status, setStatus] = useState<(typeof STATUSES)[number]["key"]>("open");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextNotice = params.get("notice");
    if (nextNotice === "market-created") {
      setNotice(
        "Market created successfully. It may take a moment to appear while the network indexes it."
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const filtered = useMemo(() => {
    return markets.filter((m) => {
      if (cat !== "all" && m.category !== cat) return false;
      if (status === "open" && m.resolved) return false;
      if (status === "resolved" && !m.resolved) return false;
      if (q && !m.question.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [markets, q, cat, status]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-20">
      <Reveal>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8 sm:mb-10">
          <div>
            <span className="chip mb-4">
              <span className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
              Live on Testnet Asimov
            </span>
            <h1 className="headline text-3xl sm:text-5xl md:text-display-lg text-balance">
              All markets,
              <span className="italic text-accent"> one feed.</span>
            </h1>
            <p className="text-sm sm:text-base text-fg-muted mt-3 max-w-xl">
              Every active and resolved prediction, indexed live from the on-chain
              factory.
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-fg-dim">
            <span className="num text-fg text-2xl block">{filtered.length}</span>
            <span>showing</span>
          </div>
        </div>
      </Reveal>

      {/* Filters */}
      <Reveal delay={0.1}>
        {notice && (
          <div className="mb-5 rounded-lg border border-yes/25 bg-yes/[0.06] px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-yes shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm text-fg">{notice}</p>
              <p className="text-xs text-fg-muted mt-1">
                Return here to find the market and place your prediction.
              </p>
            </div>
          </div>
        )}

        <div className="card p-3 md:p-4 mb-8 flex flex-col md:flex-row gap-3 items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-fg-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search markets..."
              className="input pl-10 border-transparent bg-bg-elevated focus:bg-bg-surface"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-full bg-bg-elevated border border-border">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs tracking-tight transition-colors",
                  status === s.key
                    ? "bg-bg-card text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          <SlidersHorizontal className="size-3.5 text-fg-dim shrink-0 mr-1" />
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                "relative px-3.5 py-1.5 rounded-full text-xs tracking-tight whitespace-nowrap transition-colors",
                cat === c.key ? "text-bg" : "text-fg-muted hover:text-fg"
              )}
            >
              {cat === c.key && (
                <motion.span
                  layoutId="cat-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-accent"
                />
              )}
              <span className="relative">{c.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map((m, i) => (
              <MarketCard key={m.id} m={m} index={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-8 sm:p-16 text-center"
          >
            <p className="text-fg-muted">No markets match your filters.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
