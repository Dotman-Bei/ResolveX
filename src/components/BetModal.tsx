"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Side, useGenLayer } from "@/lib/genlayer";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletModal } from "./WalletModal";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { friendlyWalletError, type FriendlyError } from "@/lib/walletErrors";

export function BetModal({
  marketId,
  yesPool,
  noPool,
  side,
  onClose,
}: {
  marketId: string;
  yesPool: number;
  noPool: number;
  side: Side;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [placedAmount, setPlacedAmount] = useState<number | null>(null);
  const [betError, setBetError] = useState<FriendlyError | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const { placeBet, connected } = useGenLayer();
  const amt = parseFloat(amount) || 0;

  // Don't double-lock when the nested WalletModal is also open; that modal
  // already calls the lock hook itself.
  useLockBodyScroll(!walletOpen);

  const total = (yesPool + noPool) / 1e18;
  const myPool = (side === "YES" ? yesPool : noPool) / 1e18;
  const newPool = myPool + amt;
  const newTotal = total + amt;
  const projectedPayout = newPool === 0 ? 0 : (amt * newTotal) / newPool;
  const profit = projectedPayout - amt;
  const oddsPct = newTotal > 0 ? (newPool / newTotal) * 100 : 50;
  const accent = side === "YES" ? "yes" : "no";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md grid place-items-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="card p-5 sm:p-7 w-full max-w-md relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              "absolute -top-24 -right-24 size-48 rounded-full blur-3xl",
              side === "YES" ? "bg-yes/15" : "bg-no/15"
            )}
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-fg-dim hover:text-fg transition-colors"
          >
            <X className="size-5" />
          </button>

          <div className="relative">
            {placedAmount !== null ? (
              <div className="text-center py-4">
                <span className="mx-auto grid place-items-center size-11 rounded-full bg-yes/10 border border-yes/30 text-yes mb-4">
                  <CheckCircle2 className="size-5" />
                </span>
                <h2 className="headline text-3xl sm:text-4xl">Bet placed</h2>
                <p className="text-sm text-fg-muted mt-3 leading-relaxed">
                  Your{" "}
                  <span className={side === "YES" ? "text-yes" : "text-no"}>
                    {side}
                  </span>{" "}
                  prediction for{" "}
                  <span className="num text-fg">{placedAmount.toFixed(4)} GEN</span>{" "}
                  has been recorded.
                </p>
                <button onClick={onClose} className="btn-primary w-full mt-7 py-3.5">
                  Back to market
                </button>
              </div>
            ) : (
              <>
                <span className="text-[11px] uppercase tracking-[0.18em] text-fg-dim">
                  Place bet on
                </span>
                <h2 className="headline text-4xl sm:text-5xl mt-1.5 mb-6">
                  <span className={side === "YES" ? "text-yes" : "text-no"}>{side}</span>
                </h2>

                <label className="block text-xs uppercase tracking-[0.16em] text-fg-dim mb-2">
                  Amount (GEN)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input num text-xl"
                  placeholder="0.0"
                />

                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 25].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="btn-secondary flex-1 text-xs num py-2"
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="mt-6 space-y-2.5 text-sm">
                  <Row label="Stake" value={`${amt.toFixed(2)} GEN`} />
                  <Row
                    label="Projected payout"
                    value={`${projectedPayout.toFixed(2)} GEN`}
                    accent={accent}
                  />
                  <Row
                    label="Profit if correct"
                    value={`+${profit.toFixed(2)} GEN`}
                    accent={accent}
                  />
                  <Row label="Implied odds" value={`${oddsPct.toFixed(0)}%`} />
                </div>

                {connected ? (
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={amt <= 0 || submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      setBetError(null);
                      try {
                        await placeBet(marketId, side, amt);
                        setPlacedAmount(amt);
                      } catch (error) {
                        setBetError(friendlyWalletError(error));
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className={cn(
                      "btn w-full mt-7 py-3.5 text-base",
                      side === "YES"
                        ? "bg-yes text-bg hover:bg-yes/90 shadow-glow-yes"
                        : "bg-no text-bg hover:bg-no/90 shadow-glow-no"
                    )}
                  >
                    {submitting ? "Confirming..." : "Confirm bet"}
                  </motion.button>
                ) : (
                  <button
                    onClick={() => setWalletOpen(true)}
                    className="btn-primary w-full mt-7 py-3.5"
                  >
                    Connect wallet to bet
                  </button>
                )}

                {betError && (
                  <div
                    className={cn(
                      "mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs",
                      betError.cancelled
                        ? "border-border bg-bg-elevated text-fg-muted"
                        : "border-no/30 bg-no/10 text-no"
                    )}
                    role="alert"
                  >
                    <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{betError.title}</p>
                      <p
                        className={cn(
                          "leading-snug mt-0.5",
                          betError.cancelled ? "text-fg-dim" : "text-no/90"
                        )}
                      >
                        {betError.detail}
                      </p>
                    </div>
                  </div>
                )}

                {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} />}

                <p className="text-[11px] text-fg-dim mt-3 text-center">
                  Funds are held by the market contract until resolution.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "yes" | "no";
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-fg-dim">{label}</span>
      <span
        className={cn(
          "num",
          accent === "yes" && "text-yes",
          accent === "no" && "text-no"
        )}
      >
        {value}
      </span>
    </div>
  );
}
