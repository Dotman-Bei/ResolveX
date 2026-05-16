"use client";
import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useGenLayer } from "@/lib/genlayer";

/**
 * Shown only when the app is running in mock mode despite being deployed
 * (i.e. NEXT_PUBLIC_GENLAYER_MODE !== "live" or the factory address is
 * missing). Prevents the silent "I thought I connected my wallet" trap.
 *
 * Hidden on localhost so local mock-mode demos stay clean.
 */
export function DemoModeBanner() {
  const { live } = useGenLayer();
  const [dismissed, setDismissed] = useState(false);

  if (live || dismissed) return null;
  if (typeof window !== "undefined" && /^(localhost|127\.)/.test(window.location.hostname)) {
    return null;
  }

  return (
    <div className="border-b border-warning/30 bg-warning/10 text-warning">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-start gap-2.5 text-xs sm:text-sm">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <p className="flex-1 leading-snug">
          <span className="font-semibold">Demo mode.</span>{" "}
          Wallet connections and bets are simulated locally — no transactions
          hit the chain. Set{" "}
          <code className="num text-[11px] px-1 py-0.5 rounded bg-warning/15">
            NEXT_PUBLIC_GENLAYER_MODE=live
          </code>{" "}
          and{" "}
          <code className="num text-[11px] px-1 py-0.5 rounded bg-warning/15">
            NEXT_PUBLIC_MARKET_FACTORY_ADDR
          </code>{" "}
          in your Vercel environment variables and redeploy.
        </p>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 text-warning/70 hover:text-warning transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
