"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Market, useGenLayer } from "@/lib/genlayer";
import {
  Brain,
  Globe,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Countdown } from "./Countdown";
import { friendlyWalletError, type FriendlyError } from "@/lib/walletErrors";
import { cn } from "@/lib/utils";

export function ResolutionPanel({ m }: { m: Market }) {
  const { resolveMarket, claimWinnings, user } = useGenLayer();
  const [resolving, setResolving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resolveError, setResolveError] = useState<FriendlyError | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<FriendlyError | null>(null);
  const [claimedAmt, setClaimedAmt] = useState<number | null>(null);

  const myBets = m.bets.filter((b) => b.user.toLowerCase() === user.toLowerCase());
  const resolutionMs = new Date(m.resolutionDate).getTime();
  const dueForResolve = !m.resolved && resolutionMs < Date.now();

  if (!m.resolved && !dueForResolve) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid place-items-center size-7 rounded-md bg-accent/10 border border-accent/30 text-accent">
            <Brain className="size-3.5" />
          </span>
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-fg-dim">
            Market resolution
          </h3>
        </div>
        <p className="text-sm text-fg-muted leading-relaxed">
          When the timer ends, validators check trusted public sources and
          confirm the final result on GenLayer. Once resolved, eligible positions
          can claim their payout.
        </p>

        <div className="mt-4 rounded-lg border border-border bg-bg-elevated px-3 py-2.5 flex items-center gap-2.5">
          <Lock className="size-3.5 text-fg-dim shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] text-fg-dim">
              Ready to resolve in
            </div>
            <Countdown target={resolutionMs} className="text-sm text-fg" />
          </div>
        </div>
      </div>
    );
  }

  if (!m.resolved && dueForResolve) {
    return (
      <div className="card p-5 relative overflow-hidden">
        <span className="absolute -top-20 -right-20 size-40 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="grid place-items-center size-7 rounded-md bg-accent/15 border border-accent/30 text-accent">
              <Zap className="size-3.5" />
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-accent">
              Ready to resolve
            </span>
          </div>
          {!confirming ? (
            <button
              disabled={resolving}
              onClick={() => setConfirming(true)}
              className="btn-primary w-full py-3"
            >
              Trigger resolution
            </button>
          ) : (
            <div className="rounded-xl border border-accent/30 bg-accent/[0.04] p-4">
              <div className="flex items-start gap-2.5 mb-3">
                <AlertTriangle className="size-4 text-accent shrink-0 mt-0.5" />
                <div className="text-xs text-fg-muted leading-relaxed">
                  Start resolution only after the outcome can be verified from
                  reliable public sources. If no clear result is available, all
                  stakes are refunded.
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={resolving}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={resolving}
                  onClick={async () => {
                    setResolving(true);
                    setResolveError(null);
                    try {
                      await resolveMarket(m.id);
                      setConfirming(false);
                    } catch (error) {
                      setResolveError(friendlyWalletError(error));
                    } finally {
                      setResolving(false);
                    }
                  }}
                  className="btn-primary flex-1 py-2.5 text-sm"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Verifying result...
                    </>
                  ) : (
                    "Confirm & resolve"
                  )}
                </button>
              </div>
              {resolveError && (
                <div
                  className={cn(
                    "mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs",
                    resolveError.cancelled
                      ? "border-border bg-bg-elevated text-fg-muted"
                      : "border-no/30 bg-no/10 text-no"
                  )}
                  role="alert"
                >
                  <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{resolveError.title}</p>
                    <p
                      className={cn(
                        "leading-snug mt-0.5",
                        resolveError.cancelled ? "text-fg-dim" : "text-no/90"
                      )}
                    >
                      {resolveError.detail}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <AnimatePresence>
            {resolving && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 space-y-2.5 text-xs num text-fg-muted overflow-hidden"
              >
                <Step icon={<Globe className="size-3" />} label="Checking public sources" />
                <Step icon={<Brain className="size-3" />} label="Reviewing the evidence" />
                <Step icon={<ShieldCheck className="size-3" />} label="Confirming final result" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 relative overflow-hidden">
      <span className="absolute -top-20 -right-20 size-40 rounded-full bg-yes/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="size-4 text-yes" />
          <span className="text-[11px] uppercase tracking-[0.16em] text-fg-dim">
            Resolved
          </span>
          <span className="ml-auto chip-yes num">{m.outcome}</span>
        </div>

        {m.validatorVotes && (
          <div className="text-xs text-fg-muted mb-5">
            Verification agreement:{" "}
            <span className="text-fg num">
              {Math.max(
                m.validatorVotes.yes,
                m.validatorVotes.no,
                m.validatorVotes.void
              )}
              /{m.validatorVotes.total}
            </span>{" "}
            agreed
          </div>
        )}

        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-dim mb-2.5">
            Sources used for resolution
          </p>
          <ul className="space-y-1.5 text-xs">
            {m.resolutionSources.map((s) => (
              <li key={s} className="truncate">
                <a
                  href={s}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline num"
                >
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {(() => {
          if (myBets.length === 0 || claimedAmt !== null) return null;
          // VOID refunds every stake; otherwise only winning-side bets can claim.
          const claimable =
            m.outcome === "VOID" || myBets.some((b) => b.side === m.outcome);
          if (!claimable) {
            return (
              <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-xs text-fg-muted">
                Your bet was on the losing side — nothing to claim. Losing
                stakes go to the winners&apos; pool.
              </div>
            );
          }
          return (
            <>
              <button
                disabled={claiming}
                onClick={async () => {
                  setClaiming(true);
                  setClaimError(null);
                  try {
                    setClaimedAmt(await claimWinnings(m.id));
                  } catch (error) {
                    setClaimError(friendlyWalletError(error));
                  } finally {
                    setClaiming(false);
                  }
                }}
                className="btn-primary w-full py-3"
              >
                {claiming
                  ? "Claiming..."
                  : m.outcome === "VOID"
                    ? "Claim refund"
                    : "Claim winnings"}
              </button>
              {claimError && (
                <div
                  className={cn(
                    "mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs",
                    claimError.cancelled
                      ? "border-border bg-bg-elevated text-fg-muted"
                      : "border-no/30 bg-no/10 text-no"
                  )}
                  role="alert"
                >
                  <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{claimError.title}</p>
                    <p
                      className={cn(
                        "leading-snug mt-0.5",
                        claimError.cancelled ? "text-fg-dim" : "text-no/90"
                      )}
                    >
                      {claimError.detail}
                    </p>
                  </div>
                </div>
              )}
            </>
          );
        })()}
        {claimedAmt !== null && (
          <div className="text-center text-sm text-yes py-2">
            {claimedAmt > 0 ? (
              <>
                <span className="num">Claim submitted: {claimedAmt.toFixed(4)} GEN</span>
                <span className="block text-xs text-fg-muted mt-1">
                  Payout is released after finalization.
                </span>
              </>
            ) : (
              "Nothing to claim"
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-accent">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
