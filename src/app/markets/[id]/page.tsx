"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Side, useGenLayer } from "@/lib/genlayer";
import { OddsBar } from "@/components/OddsBar";
import { BetModal } from "@/components/BetModal";
import { ResolutionPanel } from "@/components/ResolutionPanel";
import { Reveal } from "@/components/motion/Reveal";
import { Countdown } from "@/components/Countdown";
import { formatGen, shortAddr } from "@/lib/utils";
import { Calendar, User, Activity, ArrowLeft } from "lucide-react";

export default function MarketDetail() {
  const params = useParams<{ id: string }>();
  const { markets, user } = useGenLayer();
  const m = markets.find((x) => x.id === params.id);
  const [betSide, setBetSide] = useState<Side | null>(null);
  // Bump on the resolution moment so the bet buttons flip from enabled to
  // locked exactly when the clock crosses it — without the user having to
  // refresh the page.
  const [, setLockTick] = useState(0);

  // Derive once so the values are stable for the hooks below. They must all
  // run unconditionally (no early return between them) — React requires the
  // same hook count on every render of a component.
  const resolutionMs = m ? new Date(m.resolutionDate).getTime() : NaN;
  const pastResolution = !Number.isNaN(resolutionMs) && resolutionMs <= Date.now();
  const resolved = Boolean(m?.resolved);

  useEffect(() => {
    if (!m || resolved || pastResolution) return;
    const id = window.setTimeout(
      () => setLockTick((t) => t + 1),
      Math.max(0, resolutionMs - Date.now())
    );
    return () => window.clearTimeout(id);
  }, [m, resolved, pastResolution, resolutionMs]);

  if (!m) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
        <h1 className="headline text-3xl sm:text-4xl mb-3">Market is syncing</h1>
        <p className="text-fg-muted text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          If you just created this market, it may take a moment to appear in the
          live feed. Return to markets to find it and place your prediction.
        </p>
        <Link href="/markets" className="text-accent mt-4 inline-block link-underline">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const myBets = m.bets.filter((b) => b.user.toLowerCase() === user.toLowerCase());
  const myYes =
    myBets.filter((b) => b.side === "YES").reduce((s, b) => s + b.amount, 0) / 1e18;
  const myNo =
    myBets.filter((b) => b.side === "NO").reduce((s, b) => s + b.amount, 0) / 1e18;
  const yesPct = (m.totalYes / Math.max(m.totalYes + m.totalNo, 1)) * 100;
  const bettingLocked = resolved || pastResolution;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-20">
      <Link
        href="/markets"
        className="text-fg-muted hover:text-fg text-sm inline-flex items-center gap-1.5 mb-6 sm:mb-8 group"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        All markets
      </Link>

      <div className="grid lg:grid-cols-[1fr_minmax(0,360px)] gap-6 lg:gap-8">
        <div className="space-y-6 min-w-0">
          {/* Header */}
          <Reveal>
            <div className="card p-5 sm:p-7 md:p-8 relative overflow-hidden">
              <span className="absolute -top-32 -right-32 size-64 rounded-full bg-accent/8 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                  <span className="chip-accent uppercase tracking-[0.16em]">
                    {m.category}
                  </span>
                  {!m.resolved && (
                    <span className="chip">
                      <Calendar className="size-3" />
                      <span className="num">Resolves in </span>
                      <Countdown
                        target={m.resolutionDate}
                        doneLabel={<span className="text-accent">ready to resolve</span>}
                      />
                    </span>
                  )}
                </div>

                <h1 className="headline text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.1] text-balance break-words">
                  {m.question}
                </h1>

                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-dim">
                  <span className="flex items-center gap-1.5">
                    <User className="size-3" />
                    <span className="num">{shortAddr(m.creator)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3" />
                    <span className="num">
                      {new Date(m.resolutionDate).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Activity className="size-3" />
                    <span className="num">{m.bets.length} bets</span>
                  </span>
                </div>

                <div className="mt-8">
                  <OddsBar yes={m.totalYes} no={m.totalNo} size="lg" />
                </div>

                <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={bettingLocked ? undefined : { y: -1 }}
                    whileTap={bettingLocked ? undefined : { scale: 0.98 }}
                    disabled={bettingLocked}
                    onClick={() => setBetSide("YES")}
                    className="btn-yes py-3 sm:py-4 text-sm sm:text-base"
                  >
                    Bet YES
                    <span className="num text-xs opacity-70">
                      {yesPct.toFixed(0)}%
                    </span>
                  </motion.button>
                  <motion.button
                    whileHover={bettingLocked ? undefined : { y: -1 }}
                    whileTap={bettingLocked ? undefined : { scale: 0.98 }}
                    disabled={bettingLocked}
                    onClick={() => setBetSide("NO")}
                    className="btn-no py-3 sm:py-4 text-sm sm:text-base"
                  >
                    Bet NO
                    <span className="num text-xs opacity-70">
                      {(100 - yesPct).toFixed(0)}%
                    </span>
                  </motion.button>
                </div>

                {pastResolution && !m.resolved && (
                  <p className="mt-3 text-[11px] text-fg-dim text-center">
                    Bets locked — awaiting validator resolution.
                  </p>
                )}
                {m.resolved && (
                  <p className="mt-3 text-[11px] text-fg-dim text-center">
                    Market resolved · no further bets accepted.
                  </p>
                )}
              </div>
            </div>
          </Reveal>

          {/* Recent bets */}
          <Reveal delay={0.1}>
            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium tracking-tight">Recent activity</h3>
                <span className="text-[11px] uppercase tracking-[0.16em] text-fg-dim">
                  {m.bets.length} total
                </span>
              </div>
              {m.bets.length === 0 ? (
                <p className="text-sm text-fg-muted">No bets yet. Be the first.</p>
              ) : (
                <ul className="space-y-1">
                  {[...m.bets]
                    .reverse()
                    .slice(0, 8)
                    .map((b, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 sm:gap-4 py-2.5 px-3 -mx-3 rounded-lg hover:bg-bg-elevated transition-colors text-sm"
                      >
                        <span className="num text-[11px] sm:text-xs text-fg-muted truncate">
                          {shortAddr(b.user)}
                        </span>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span
                            className={
                              b.side === "YES" ? "chip-yes" : "chip-no"
                            }
                          >
                            {b.side}
                          </span>
                          <span className="num text-[11px] sm:text-xs text-fg-muted whitespace-nowrap">
                            {formatGen(BigInt(b.amount))} GEN
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </Reveal>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Reveal delay={0.15}>
            <div className="card p-5">
              <h3 className="text-[11px] uppercase tracking-[0.16em] text-fg-dim mb-4">
                Pools
              </h3>
              <div className="space-y-3 text-sm">
                <PoolRow label="YES" value={m.totalYes} accent="yes" />
                <PoolRow label="NO" value={m.totalNo} accent="no" />
                <div className="divider" />
                <PoolRow label="Total" value={m.totalYes + m.totalNo} />
              </div>
            </div>
          </Reveal>

          {(myYes > 0 || myNo > 0) && (
            <Reveal delay={0.2}>
              <div className="card p-5">
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-fg-dim mb-4">
                  Your position
                </h3>
                {myYes > 0 && (
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-yes">YES</span>
                    <span className="num">{myYes.toFixed(4)} GEN</span>
                  </div>
                )}
                {myNo > 0 && (
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-no">NO</span>
                    <span className="num">{myNo.toFixed(4)} GEN</span>
                  </div>
                )}
              </div>
            </Reveal>
          )}

          <Reveal delay={0.25}>
            <ResolutionPanel m={m} />
          </Reveal>
        </div>
      </div>

      {betSide && !bettingLocked && (
        <BetModal
          marketId={m.id}
          yesPool={m.totalYes}
          noPool={m.totalNo}
          side={betSide}
          onClose={() => setBetSide(null)}
        />
      )}
    </div>
  );
}

function PoolRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "yes" | "no";
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className={
          accent === "yes"
            ? "text-yes"
            : accent === "no"
            ? "text-no"
            : "text-fg-muted"
        }
      >
        {label}
      </span>
      <span className="num text-fg">{formatGen(BigInt(value))} GEN</span>
    </div>
  );
}
