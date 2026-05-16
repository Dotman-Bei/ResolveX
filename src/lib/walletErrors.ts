// Translates raw wallet / RPC / viem errors into short human messages the
// user can act on. Keep these strings short — they render inline in modals.

export interface FriendlyError {
  title: string;
  detail: string;
  /** True when the user actively dismissed/declined — usually not worth alarming UI. */
  cancelled: boolean;
}

const code = (e: unknown): number | undefined => {
  if (typeof e !== "object" || e === null) return undefined;
  const c = (e as { code?: unknown }).code;
  return typeof c === "number" ? c : undefined;
};

const message = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (typeof e === "object" && e !== null) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
};

export function friendlyWalletError(error: unknown): FriendlyError {
  const c = code(error);
  const raw = message(error).trim();
  const lower = raw.toLowerCase();

  // --- EIP-1193 standard codes ---------------------------------------------
  if (c === 4001 || /user (rejected|denied|cancell?ed)/i.test(raw)) {
    return {
      title: "Request cancelled",
      detail: "You declined the wallet prompt. Try again whenever you're ready.",
      cancelled: true,
    };
  }
  if (c === 4100) {
    return {
      title: "Wallet not authorized",
      detail:
        "Your wallet hasn't authorized this site for that account. Unlock the wallet and reconnect.",
      cancelled: false,
    };
  }
  if (c === 4900 || c === 4901 || /disconnected/i.test(lower)) {
    return {
      title: "Wallet disconnected",
      detail:
        "Your wallet is no longer connected to the network. Reopen the wallet and reconnect to GenLayer Testnet Asimov.",
      cancelled: false,
    };
  }
  if (c === 4902 || /unrecognized chain|chain not added/i.test(lower)) {
    return {
      title: "Wrong network",
      detail:
        "Your wallet hasn't added GenLayer Testnet Asimov yet. Approve the 'Add network' prompt and try again.",
      cancelled: false,
    };
  }

  // --- Funds / gas ---------------------------------------------------------
  if (
    /insufficient funds|insufficient balance|exceeds balance/i.test(lower) ||
    c === -32000
  ) {
    return {
      title: "Insufficient funds",
      detail:
        "Your wallet doesn't have enough GEN to cover this transaction plus gas. Top up from the GenLayer Testnet faucet and try again.",
      cancelled: false,
    };
  }
  if (/intrinsic gas too low|gas required exceeds|out of gas/i.test(lower)) {
    return {
      title: "Gas estimate too low",
      detail:
        "The wallet rejected the gas estimate. Try again — if it keeps happening, raise the gas limit manually in your wallet's advanced settings.",
      cancelled: false,
    };
  }
  if (/replacement transaction underpriced|already known|nonce too low/i.test(lower)) {
    return {
      title: "Transaction conflict",
      detail:
        "Another transaction from this wallet is still pending or has the same nonce. Wait for it to confirm, then retry.",
      cancelled: false,
    };
  }

  // --- RPC / network -------------------------------------------------------
  if (/rate ?limit|429|limit exceeded|too many requests/i.test(lower)) {
    return {
      title: "Network rate limit",
      detail:
        "The GenLayer RPC is throttling requests right now. Wait a few seconds and try again.",
      cancelled: false,
    };
  }
  if (/network ?error|fetch failed|failed to fetch|enotfound|timeout/i.test(lower)) {
    return {
      title: "Network error",
      detail:
        "Couldn't reach the GenLayer RPC. Check your connection and try again.",
      cancelled: false,
    };
  }
  if (/consensus failed|undetermined/i.test(lower)) {
    return {
      title: "Validator consensus failed",
      detail:
        "Validators couldn't agree on this transaction. This is usually transient on testnet — try again in a moment.",
      cancelled: false,
    };
  }

  // --- Contract assert messages (our prediction_market.py asserts) --------
  if (/no bet found/i.test(lower)) {
    return {
      title: "Nothing to claim",
      detail:
        "This wallet has no claimable stake on this market — either you didn't bet, or you already claimed.",
      cancelled: false,
    };
  }
  if (/on the losing side|losing side/i.test(lower)) {
    return {
      title: "Bet did not win",
      detail:
        "Your prediction was on the losing side, so there are no winnings to claim. Losing stakes stay in the winners' pool.",
      cancelled: false,
    };
  }
  if (/market not yet resolved/i.test(lower)) {
    return {
      title: "Market not resolved yet",
      detail:
        "Validators haven't committed an outcome for this market yet. Wait for resolution, then try again.",
      cancelled: false,
    };
  }
  if (/already resolved|market already resolved/i.test(lower)) {
    return {
      title: "Market already resolved",
      detail: "This market has already been finalized — no further bets accepted.",
      cancelled: false,
    };
  }
  if (/cannot bet both sides/i.test(lower)) {
    return {
      title: "Pick one side",
      detail:
        "You already have a bet on the other side from this address. Use a different wallet to bet the opposite outcome.",
      cancelled: false,
    };
  }
  if (/must send funds to bet/i.test(lower)) {
    return {
      title: "Stake required",
      detail: "A bet must include some GEN — set a non-zero amount and try again.",
      cancelled: false,
    };
  }

  // --- Generic revert (contract returned a reason string we didn't catch above) --
  const revertMatch =
    raw.match(/reverted? with (?:reason string )?['"]?([^'"\n]+?)['"]?(?:$|[\n,])/i) ||
    raw.match(/AssertionError:\s*([^\n]+)/i) ||
    raw.match(/execution reverted:?\s*([^\n]+)/i);
  if (revertMatch) {
    return {
      title: "Transaction reverted",
      detail: `The contract refused this call: ${revertMatch[1].trim()}.`,
      cancelled: false,
    };
  }

  // --- Wallet missing ------------------------------------------------------
  if (/no compatible wallet|no provider/i.test(lower)) {
    return {
      title: "No wallet detected",
      detail:
        "We couldn't find an EVM wallet in this browser. Install MetaMask, Rabby, or another EIP-1193 wallet and refresh.",
      cancelled: false,
    };
  }

  // --- Fallback: keep the first informative line, cap length, no JSON noise --
  const cleaned = raw
    .replace(/^Error:\s*/i, "")
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("{") && !line.startsWith("[")) ?? "";
  const capped = cleaned.length > 240 ? `${cleaned.slice(0, 237)}…` : cleaned;
  return {
    title: "Transaction failed",
    detail:
      capped.length > 0
        ? capped
        : "The wallet returned an empty error. Check the wallet's activity log for details, then try again.",
    cancelled: false,
  };
}
