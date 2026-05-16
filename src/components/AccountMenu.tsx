"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, LogOut, ExternalLink, Check, Wallet } from "lucide-react";
import { useGenLayer } from "@/lib/genlayer";
import { shortAddr } from "@/lib/utils";

const EXPLORER = "https://explorer-asimov.genlayer.com/address/";

export function AccountMenu() {
  const { user, disconnect, walletName } = useGenLayer();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const copy = async () => {
    await navigator.clipboard.writeText(user);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div ref={ref} className="relative">
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary num text-xs"
      >
        <span className="size-1.5 rounded-full bg-yes animate-pulse-soft" />
        {shortAddr(user)}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] origin-top-right rounded-2xl border border-border bg-bg-elevated shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-fg-dim">
                <Wallet className="size-3" />
                {walletName ?? "Connected"}
              </div>
              <div className="mt-1 font-mono text-sm text-fg break-all">{user}</div>
            </div>

            <div className="p-1.5">
              <MenuItem onClick={copy} icon={copied ? Check : Copy}>
                {copied ? "Copied" : "Copy address"}
              </MenuItem>
              <MenuItem
                onClick={() => window.open(EXPLORER + user, "_blank", "noopener,noreferrer")}
                icon={ExternalLink}
              >
                View on explorer
              </MenuItem>
              <div className="h-px bg-border my-1.5 mx-2" />
              <MenuItem
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
                icon={LogOut}
                danger
              >
                Disconnect wallet
              </MenuItem>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  onClick,
  icon: Icon,
  children,
  danger,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left " +
        (danger ? "text-no hover:bg-no/10" : "text-fg hover:bg-bg")
      }
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}
