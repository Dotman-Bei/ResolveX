"use client";

import { useEffect, useState } from "react";
import { Eip1193Provider, registerProvider } from "./genlayer";

export interface WalletInfo {
  rdns: string;
  name: string;
  icon: string;
  installUrl?: string;
  recommended?: boolean;
  note?: string;
}

export interface DetectedWallet extends WalletInfo {
  provider: Eip1193Provider;
}

// Curated GenLayer-supported wallets. MetaMask is the primary because the
// GenLayer Snap (npm:genlayer-wallet-plugin) only runs there; the rest are
// EIP-1193 compatible and can submit the underlying EVM transactions.
export const SUPPORTED_WALLETS: WalletInfo[] = [
  {
    rdns: "io.metamask",
    name: "MetaMask",
    icon: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/SVG_MetaMask_Icon_Color.svg",
    installUrl: "https://metamask.io/download/",
    recommended: true,
    note: "Best on GenLayer · supports GenLayer Snap",
  },
  {
    rdns: "io.rabby",
    name: "Rabby Wallet",
    icon: "https://rabby.io/assets/images/logo-128.png",
    installUrl: "https://rabby.io/",
  },
  {
    rdns: "com.coinbase.wallet",
    name: "Coinbase Wallet",
    icon: "https://www.coinbase.com/assets/sub-brands/wallet/wallet-mark.svg",
    installUrl: "https://www.coinbase.com/wallet/downloads",
  },
  {
    rdns: "com.trustwallet.app",
    name: "Trust Wallet",
    icon: "https://trustwallet.com/assets/images/media/assets/TWT.png",
    installUrl: "https://trustwallet.com/download",
  },
  {
    rdns: "com.brave.wallet",
    name: "Brave Wallet",
    icon: "https://brave.com/static-assets/images/brave-logo-no-shadow.png",
    installUrl: "https://brave.com/wallet/",
  },
];

interface Eip6963AnnounceEvent extends CustomEvent {
  detail: {
    info: { uuid: string; name: string; icon: string; rdns: string };
    provider: Eip1193Provider;
  };
}

/**
 * Imperative one-shot EIP-6963 discovery — fires the `requestProvider` event,
 * registers anything that announces within a short window, then resolves.
 * Used at app boot to populate the provider registry before the silent
 * reconnect tries to look up the user's previously chosen wallet by rdns.
 */
export function discoverProvidersOnce(timeoutMs = 250): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    const onAnnounce = (event: Event) => {
      const e = event as Eip6963AnnounceEvent;
      const { info, provider } = e.detail;
      if (info?.rdns) registerProvider(info.rdns, provider);
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve();
    }, timeoutMs);
  });
}

export function useWallets() {
  const [detected, setDetected] = useState<DetectedWallet[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const seen = new Map<string, DetectedWallet>();

    const onAnnounce = (event: Event) => {
      const e = event as Eip6963AnnounceEvent;
      const { info, provider } = e.detail;
      if (!info?.rdns || seen.has(info.rdns)) return;
      registerProvider(info.rdns, provider);
      const curated = SUPPORTED_WALLETS.find((w) => w.rdns === info.rdns);
      seen.set(info.rdns, {
        rdns: info.rdns,
        name: curated?.name ?? info.name,
        icon: curated?.icon ?? info.icon,
        provider,
        recommended: curated?.recommended,
        note: curated?.note,
      });
      setDetected(Array.from(seen.values()));
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  const detectedMap = new Map(detected.map((w) => [w.rdns, w]));
  const recommended = SUPPORTED_WALLETS.map((w) => ({
    ...w,
    installed: detectedMap.has(w.rdns),
  }));
  const other = detected.filter((w) => !SUPPORTED_WALLETS.some((s) => s.rdns === w.rdns));

  return { detected, recommended, other };
}
