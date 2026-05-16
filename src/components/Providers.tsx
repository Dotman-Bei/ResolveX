"use client";
import { ReactNode, useEffect } from "react";
import { useGenLayer } from "@/lib/genlayer";

export function Providers({ children }: { children: ReactNode }) {
  const { live, refresh, reconnectSilent } = useGenLayer();

  // In live mode, every visitor (connected or not) needs to see the on-chain
  // markets. Before that, try a silent reconnect to the wallet the user
  // chose last time — that way returning visitors stay logged in across
  // refreshes without a popup, while new visitors still see the Connect
  // button. Both calls are coalesced/idempotent so React Strict Mode's
  // double-mount in dev is harmless.
  useEffect(() => {
    if (!live) return;
    void (async () => {
      await reconnectSilent();
      await refresh();
    })();
  }, [live, refresh, reconnectSilent]);

  return <>{children}</>;
}
