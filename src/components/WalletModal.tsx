"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ExternalLink, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import { useGenLayer } from "@/lib/genlayer";
import { useWallets } from "@/lib/wallets";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { friendlyWalletError, type FriendlyError } from "@/lib/walletErrors";
import { cn } from "@/lib/utils";

export function WalletModal({ onClose }: { onClose: () => void }) {
  const { connect } = useGenLayer();
  const { recommended, other } = useWallets();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);

  useLockBodyScroll(true);

  const handleConnect = async (rdns: string, name: string, installed: boolean, installUrl?: string) => {
    if (!installed) {
      if (installUrl) window.open(installUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setPending(rdns);
    setError(null);
    try {
      await connect({ rdns, name });
      onClose();
    } catch (e) {
      setError(friendlyWalletError(e));
    } finally {
      setPending(null);
    }
  };

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
          className="card p-5 sm:p-7 w-full max-w-md relative overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="absolute -top-24 -right-24 size-48 rounded-full blur-3xl bg-accent/15" />
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-fg-dim hover:text-fg transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          <div className="relative">
            <span className="text-[11px] uppercase tracking-[0.18em] text-fg-dim">
              Connect a wallet
            </span>
            <h2 className="headline text-2xl sm:text-3xl mt-1.5 pr-8">
              Choose your <span className="text-accent">GenLayer</span> wallet
            </h2>
            <p className="text-sm text-fg-dim mt-2">
              ResolveX works with any EVM wallet. MetaMask is recommended for the GenLayer Snap experience.
            </p>

            <div className="mt-6 space-y-2">
              {recommended.map((w) => (
                <WalletRow
                  key={w.rdns}
                  name={w.name}
                  icon={w.icon}
                  installed={w.installed}
                  recommended={w.recommended}
                  note={w.note}
                  pending={pending === w.rdns}
                  onClick={() => handleConnect(w.rdns, w.name, w.installed, w.installUrl)}
                />
              ))}

              {other.length > 0 && (
                <>
                  <div className="pt-3 pb-1 text-[11px] uppercase tracking-[0.16em] text-fg-dim">
                    Also detected
                  </div>
                  {other.map((w) => (
                    <WalletRow
                      key={w.rdns}
                      name={w.name}
                      icon={w.icon}
                      installed
                      pending={pending === w.rdns}
                      onClick={() => handleConnect(w.rdns, w.name, true)}
                    />
                  ))}
                </>
              )}
            </div>

            {error && (
              <div
                className={cn(
                  "mt-4 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs",
                  error.cancelled
                    ? "border-border bg-bg-elevated text-fg-muted"
                    : "border-no/30 bg-no/10 text-no"
                )}
                role="alert"
              >
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{error.title}</p>
                  <p
                    className={cn(
                      "leading-snug mt-0.5",
                      error.cancelled ? "text-fg-dim" : "text-no/90"
                    )}
                  >
                    {error.detail}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-5 flex items-start gap-2 text-[11px] text-fg-dim">
              <ShieldCheck className="size-3.5 mt-0.5 shrink-0 text-accent" />
              <span>
                ResolveX never sees your keys. Connections are local to your browser and you can disconnect at any time.
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WalletRow({
  name,
  icon,
  installed,
  recommended,
  note,
  pending,
  onClick,
}: {
  name: string;
  icon: string;
  installed: boolean;
  recommended?: boolean;
  note?: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
        "bg-bg-elevated hover:bg-bg-elevated/70 border-border",
        recommended && "border-accent/40 hover:border-accent/60",
        pending && "opacity-60 cursor-wait"
      )}
    >
      <span className="relative size-9 rounded-lg overflow-hidden bg-bg shrink-0 grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt={name} className="size-7 object-contain" />
      </span>
      <span className="flex-1 text-left min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{name}</span>
          {recommended && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-accent shrink-0">
              <Sparkles className="size-3" />
              Recommended
            </span>
          )}
        </span>
        <span className="text-[11px] text-fg-dim block mt-0.5 truncate">
          {note ?? (installed ? "Detected in browser" : "Not installed — click to get it")}
        </span>
      </span>
      {pending ? (
        <span className="text-[11px] text-fg-dim">Connecting…</span>
      ) : installed ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-yes">
          <Check className="size-3.5" />
          Ready
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] text-fg-dim">
          Install
          <ExternalLink className="size-3" />
        </span>
      )}
    </button>
  );
}
