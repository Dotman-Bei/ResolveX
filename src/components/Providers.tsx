"use client";
import { ReactNode, useEffect } from "react";
import { useGenLayer } from "@/lib/genlayer";

export function Providers({ children }: { children: ReactNode }) {
  const { live, refresh } = useGenLayer();

  // In live mode, every visitor (connected or not) needs to see the on-chain
  // markets. `refresh()` was previously only fired from `connect()`, which
  // meant a fresh page load with no active session would show an empty feed.
  useEffect(() => {
    if (!live) return;
    void refresh();
  }, [live, refresh]);

  return <>{children}</>;
}
