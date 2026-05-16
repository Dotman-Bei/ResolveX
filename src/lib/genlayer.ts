// GenLayer SDK wrapper.
//
// The UI talks to this Zustand store. It keeps the mock demo path available,
// but switches to real GenLayer SDK calls when live mode and deployed
// contract addresses are configured.

import { createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import type {
  Address,
  CalldataEncodable,
  GenLayerChain,
  GenLayerClient,
  TransactionHash,
} from "genlayer-js/types";
import { parseEther } from "viem";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import predictionMarketSource from "../../contracts/prediction_market.py";

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

// EIP-6963 providers (discovered at runtime) and a legacy fallback live here.
// We never serialize them — the store only persists the chosen wallet's rdns
// so we can re-pick the same provider on the next page load.
const providerRegistry = new Map<string, Eip1193Provider>();

export const registerProvider = (rdns: string, provider: Eip1193Provider) => {
  providerRegistry.set(rdns, provider);
};

const resolveProvider = (rdns?: string): Eip1193Provider | undefined => {
  if (rdns && providerRegistry.has(rdns)) return providerRegistry.get(rdns);
  if (typeof window !== "undefined" && window.ethereum) return window.ethereum;
  return undefined;
};

export type Side = "YES" | "NO";
export type Outcome = "YES" | "NO" | "VOID" | "";
export type Category = "crypto" | "sports" | "politics" | "entertainment" | "tech" | "world";

export interface Bet {
  user: string;
  side: Side;
  amount: number;
  ts: number;
}

export interface Market {
  id: string;
  question: string;
  category: Category;
  creator: string;
  resolutionDate: string;
  totalYes: number;
  totalNo: number;
  bets: Bet[];
  resolved: boolean;
  outcome: Outcome;
  resolutionSources: string[];
  validatorVotes?: { yes: number; no: number; void: number; total: number };
  createdAt: number;
}

const DEMO_USER = "0xA11ce0000000000000000000000000000000B0b1";
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const CATEGORIES: Category[] = ["crypto", "sports", "politics", "entertainment", "tech", "world"];
const SPORTS_KEYWORDS = [
  "champions league",
  "premier league",
  "world cup",
  "fifa",
  "uefa",
  "nba",
  "nfl",
  "mlb",
  "nhl",
  "wimbledon",
  "olympic",
  "real madrid",
  "manchester",
  "arsenal",
  "barcelona",
  "liverpool",
  "chelsea",
  "super eagles",
  "qualify",
  "title",
  "tournament",
  "match",
  "league",
];
const CRYPTO_KEYWORDS = [
  "bitcoin",
  "btc",
  "ethereum",
  "ether ",
  "eth ",
  "solana",
  "ripple",
  "xrp",
  "cardano",
  "dogecoin",
  "chainlink",
  "avalanche",
  "polygon",
  "litecoin",
  "uniswap",
  "tether",
  "usdt",
  "usdc",
  "binance coin",
  "bnb",
  "shiba",
];
const TECH_KEYWORDS = [
  "spacex",
  "openai",
  "apple",
  "google",
  "microsoft",
  "tesla",
  "nvidia",
  "ai ",
  "gpt",
  "iphone",
  "android",
];
const ENTERTAINMENT_KEYWORDS = [
  "grammy",
  "oscar",
  "emmy",
  "album",
  "movie",
  "film",
  "box office",
  "gta",
  "netflix",
  "music",
];

const hasAny = (text: string, words: readonly string[]) => {
  const padded = `${text.toLowerCase()} `;
  return words.some((word) => padded.includes(word));
};

export const inferMarketCategory = (question: string, fallback: Category = "world"): Category => {
  const lower = question.toLowerCase();
  if (hasAny(lower, SPORTS_KEYWORDS)) return "sports";
  if (hasAny(lower, CRYPTO_KEYWORDS)) return "crypto";
  if (hasAny(lower, ENTERTAINMENT_KEYWORDS)) return "entertainment";
  if (hasAny(lower, TECH_KEYWORDS)) return "tech";
  return fallback;
};

const env = {
  mode: process.env.NEXT_PUBLIC_GENLAYER_MODE ?? "mock",
  network: process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "testnetAsimov",
  rpc: process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://rpc-asimov.genlayer.com",
  consensus:
    process.env.NEXT_PUBLIC_GENLAYER_CONSENSUS_ADDR ??
    (process.env.NEXT_PUBLIC_GENLAYER_NETWORK === "testnetAsimov"
      ? "0x6CAFF6769d70824745AD895663409DC70aB5B28E"
      : ""),
  marketFactory: process.env.NEXT_PUBLIC_MARKET_FACTORY_ADDR ?? "",
};

const isAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);
const liveConfigured = () => env.mode === "live" && isAddress(env.marketFactory);

const chainForEnv = (): GenLayerChain => {
  const base =
    env.network === "localnet" ? localnet : env.network === "studionet" ? studionet : testnetAsimov;

  return {
    ...base,
    rpcUrls: {
      ...base.rpcUrls,
      default: { http: [env.rpc || base.rpcUrls.default.http[0].trim()] },
    },
    ...(isAddress(env.consensus)
      ? {
          consensusMainContract: {
            ...base.consensusMainContract,
            address: env.consensus,
          },
        }
      : {}),
  } as GenLayerChain;
};

let client: GenLayerClient<GenLayerChain> | null = null;
let pendingRefresh: Promise<void> | null = null;

const getClient = (account?: Address) => {
  const chain = chainForEnv();
  client = createClient({
    chain,
    ...(account ? { account } : {}),
  });
  return client;
};

const normalizeAddress = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (v.bytes instanceof Uint8Array) {
      return `0x${Array.from(v.bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`;
    }
    if (typeof v.address === "string") return v.address.toLowerCase();
    if (typeof v.hex === "string") return v.hex.toLowerCase();
    // Last-ditch: many wallet/SDK address classes implement toString() → 0x…
    if (typeof (value as { toString?: () => string }).toString === "function") {
      const s = (value as { toString: () => string }).toString();
      if (/^0x[a-fA-F0-9]{40}$/.test(s)) return s.toLowerCase();
    }
  }
  return "";
};

const toNumber = (value: unknown) => {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && value !== "") return Number(value);
  return 0;
};

const asOutcome = (value: unknown): Outcome => {
  const next = String(value ?? "").toUpperCase();
  return next === "YES" || next === "NO" || next === "VOID" ? next : "";
};

const asSide = (value: unknown): Side => (String(value).toUpperCase() === "NO" ? "NO" : "YES");

const waitAccepted = async (hash: `0x${string}`) => {
  if (!client) throw new Error("GenLayer client is not connected");
  const receipt = await client.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 120,
  });
  if (receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
    let detail = "";
    try {
      const trace = await client.debugTraceTransaction({ hash: hash as TransactionHash, round: 0 });
      const returnText =
        trace.return_data?.startsWith("0x") && trace.return_data.length > 2
          ? new TextDecoder().decode(
              new Uint8Array(
                trace.return_data
                  .slice(2)
                  .match(/.{1,2}/g)
                  ?.map((byte) => parseInt(byte, 16)) ?? []
              )
            )
          : trace.return_data;
      detail = [returnText, trace.stderr].filter(Boolean).join(" ");
    } catch {
      // Keep the original failure path if the trace endpoint is unavailable.
    }
    throw new Error(detail || "Transaction failed on-chain. Please try again after finalization.");
  }
  return receipt;
};

const switchWallet = async (rdns?: string) => {
  const provider = resolveProvider(rdns);
  if (!provider) throw new Error("No compatible wallet detected. Install MetaMask, Rabby, or another EVM wallet.");
  const chain = chainForEnv();
  const chainId = `0x${chain.id.toString(16)}`;
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId,
        chainName: chain.name,
        rpcUrls: chain.rpcUrls.default.http,
        nativeCurrency: chain.nativeCurrency,
        blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : [],
      },
    ],
  });
  await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });

  try {
    const snaps = (await provider.request({ method: "wallet_getSnaps" })) as Record<string, { id: string }>;
    const snapId = "npm:genlayer-wallet-plugin";
    if (!Object.values(snaps).some((snap) => snap.id === snapId)) {
      await provider.request({ method: "wallet_requestSnaps", params: { [snapId]: {} } });
    }
  } catch {
    // Wallets without Snap support can still submit the underlying EVM transaction.
  }

  return accounts[0] as Address;
};

const read = async <T = CalldataEncodable>(
  address: string,
  functionName: string,
  args: CalldataEncodable[] = []
): Promise<T> => {
  if (!client) getClient();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return (await client!.readContract({
        address: address as Address,
        functionName,
        args,
      })) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRateLimit =
        /rate limit/i.test(message) || /LimitExceeded/i.test(message) || /429/.test(message);
      if (!isRateLimit || attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1) ** 2));
    }
  }
  throw new Error("unreachable");
};

// The `client` variable is module-scoped and resets to null on every page
// load. The persisted store, however, may report `connected: true` from a
// previous session — so before any write we lazily re-establish the wallet
// connection and re-init the client with an account.
const ensureSigner = async (rdns?: string) => {
  if (client?.account?.address) return;
  const account = await switchWallet(rdns);
  getClient(account);
};

const write = async (
  address: string,
  functionName: string,
  args: CalldataEncodable[] = [],
  value = 0n
) => {
  await ensureSigner(useGenLayer.getState().walletRdns);
  const hash = await client!.writeContract({
    address: address as Address,
    functionName,
    args,
    value,
  });
  await waitAccepted(hash as `0x${string}`);
  return hash as `0x${string}`;
};

const deployContract = async (code: string, args: CalldataEncodable[]) => {
  await ensureSigner(useGenLayer.getState().walletRdns);
  const hash = await client!.deployContract({ code, args });
  const receipt = await waitAccepted(hash as TransactionHash);
  const r = receipt as unknown as Record<string, unknown> & {
    data?: { contract_address?: string };
    txDataDecoded?: { contractAddress?: string };
  };
  const address =
    r.data?.contract_address ??
    r.txDataDecoded?.contractAddress ??
    (r as Record<string, string>).contractAddress ??
    (r as Record<string, string>).recipient;
  if (!address) throw new Error("Could not extract deployed address from receipt");
  return address as string;
};

// Run async work with bounded concurrency and a small inter-call delay so we
// don't trip the Testnet Asimov RPC's per-method rate limit on fan-out.
const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  delayMs: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  });
  await Promise.all(workers);
  return out;
};

const asCategory = (value: unknown): Category => {
  const s = String(value ?? "").toLowerCase();
  return (CATEGORIES as readonly string[]).includes(s) ? (s as Category) : "world";
};

// Streaming loader: as each market's data resolves, `onProgress` is called
// with the current snapshot (newest first). This lets the UI render rows the
// instant they're ready instead of blocking on the full fan-out.
const loadLiveMarkets = async (
  user: string,
  onProgress?: (markets: Market[]) => void
): Promise<Market[]> => {
  const factory = env.marketFactory;
  const addresses = ((await read(factory, "get_all_markets")) as unknown[]).map(normalizeAddress);

  // DEMO_USER is a valid-format placeholder. Skip the user-bet fan-out unless
  // a real wallet is connected so anonymous visitors don't burn rate-limited
  // RPC calls.
  const includeUser = isAddress(user) && user !== ZERO_ADDR && user !== DEMO_USER;
  const byIndex: (Market | undefined)[] = new Array(addresses.length);
  const snapshot = () =>
    addresses
      .map((_, i) => byIndex[i])
      .filter((m): m is Market => Boolean(m))
      .slice()
      .reverse(); // newest first

  await mapLimit(addresses, 4, 0, async (address, index) => {
    // Fire info + user-bet in parallel — they're independent reads on the
    // same contract, and the read() helper already retries on rate-limit.
    const [info, userBet] = await Promise.all([
      read<Record<string, unknown>>(address, "get_market_info").catch(
        () => ({}) as Record<string, unknown>
      ),
      includeUser
        ? read<Record<string, unknown>>(address, "get_user_bet", [user]).catch(
            () => ({}) as Record<string, unknown>
          )
        : Promise.resolve({} as Record<string, unknown>),
    ]);

    const betAmount = toNumber(userBet.amount);
    const betSide = asSide(userBet.side);
    const bets =
      betAmount > 0 ? [{ user, side: betSide, amount: betAmount, ts: Date.now() }] : [];

    const question = String(info.question ?? "");
    const storedCategory = asCategory(info.category);

    byIndex[index] = {
      id: address,
      question,
      category: inferMarketCategory(question, storedCategory),
      creator: normalizeAddress(info.creator),
      resolutionDate: String(info.resolution_date ?? ""),
      totalYes: toNumber(info.total_yes),
      totalNo: toNumber(info.total_no),
      bets,
      resolved: Boolean(info.resolved),
      outcome: asOutcome(info.outcome),
      resolutionSources: Array.isArray(info.resolution_sources)
        ? info.resolution_sources.map(String)
        : [],
      createdAt: Date.now() - index,
    } satisfies Market;

    onProgress?.(snapshot());
  });

  return snapshot();
};

const seedMarkets = (): Market[] => {
  const now = Date.now();
  const mk = (
    id: string,
    question: string,
    category: Category,
    daysOut: number,
    yes: number,
    no: number
  ): Market => ({
    id,
    question,
    category,
    creator: DEMO_USER,
    resolutionDate: new Date(now + daysOut * 86_400_000).toISOString(),
    totalYes: yes * 1e18,
    totalNo: no * 1e18,
    bets: [],
    resolved: false,
    outcome: "",
    resolutionSources: [],
    createdAt: now - Math.random() * 5 * 86_400_000,
  });
  return [
    mk("m1", "Will Bitcoin reach $150,000 before January 2027?", "crypto", 240, 12.4, 7.8),
    mk("m2", "Will the Super Eagles qualify for the 2026 FIFA World Cup?", "sports", 60, 9.1, 3.2),
    mk("m3", "Will Manchester City win the 2025/26 Premier League title?", "sports", 90, 4.5, 11.2),
    mk("m4", "Will Burna Boy win a Grammy in 2027?", "entertainment", 420, 2.1, 1.7),
    mk("m5", "Will Ethereum flip Bitcoin's market cap by 2027?", "crypto", 365, 1.8, 22.4),
    mk("m6", "Will GTA VI gross $2 billion in its first week?", "entertainment", 180, 14.0, 5.6),
    mk("m7", "Will Nigeria's inflation drop below 20% by end of 2026?", "world", 220, 3.3, 8.9),
    mk("m8", "Will Novak Djokovic win Wimbledon 2026?", "sports", 200, 6.0, 9.5),
  ];
};

interface Store {
  user: string;
  connected: boolean;
  live: boolean;
  status: string;
  error: string;
  walletRdns?: string;
  walletName?: string;
  markets: Market[];
  connect: (options?: { rdns?: string; name?: string }) => Promise<void>;
  disconnect: () => void;
  reconnectSilent: () => Promise<void>;
  refresh: () => Promise<void>;
  createMarket: (q: string, category: Category, resolutionDate: string) => Promise<string>;
  placeBet: (marketId: string, side: Side, amount: number) => Promise<void>;
  resolveMarket: (marketId: string) => Promise<void>;
  claimWinnings: (marketId: string) => Promise<number>;
  reset: () => void;
}

export const useGenLayer = create<Store>()(
  persist(
    (set, get) => ({
      user: DEMO_USER,
      connected: false,
      live: liveConfigured(),
      status: liveConfigured() ? "Live GenLayer mode" : "Mock demo mode",
      error: "",
      // In live mode start empty — the on-mount refresh fills it in. In mock
      // mode keep the demo seed so the UI has something to show offline.
      markets: liveConfigured() ? [] : seedMarkets(),

      connect: async (options) => {
        if (!liveConfigured()) {
          set({
            connected: true,
            live: false,
            error: "",
            status: "Mock demo mode",
            walletRdns: options?.rdns,
            walletName: options?.name ?? "Demo wallet",
          });
          return;
        }

        try {
          const account = await switchWallet(options?.rdns);
          getClient(account);
          set({
            user: account,
            connected: true,
            live: true,
            error: "",
            status: "Connected to GenLayer",
            walletRdns: options?.rdns,
            walletName: options?.name,
          });
          // Kick off market refresh in the background so the caller (e.g.
          // wallet modal) can close immediately on a successful handshake.
          void get().refresh();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      disconnect: () => {
        client = null;
        set({
          connected: false,
          user: DEMO_USER,
          walletRdns: undefined,
          walletName: undefined,
          status: liveConfigured() ? "Live GenLayer mode" : "Mock demo mode",
        });
      },

      // Re-bind to the previously chosen wallet without prompting. Uses
      // `eth_accounts` (no popup) — if the wallet still authorizes this
      // origin, we get the account back and slide silently into a connected
      // state. If it doesn't, nothing happens and the Connect button stays.
      reconnectSilent: async () => {
        if (!liveConfigured()) return;
        const rdns = get().walletRdns;
        if (!rdns) return;
        try {
          // Import lazily so the lib stays free of React-only imports.
          const { discoverProvidersOnce } = await import("./wallets");
          await discoverProvidersOnce();
          const provider = resolveProvider(rdns);
          if (!provider) return;
          const accounts = (await provider.request({ method: "eth_accounts" })) as
            | string[]
            | undefined;
          if (!accounts || accounts.length === 0) return;
          const account = accounts[0] as Address;
          getClient(account);
          set({
            user: account,
            connected: true,
            live: true,
            status: "Connected to GenLayer",
          });
        } catch {
          // Silent reconnect must never throw into the UI — worst case we
          // simply stay disconnected and the user clicks Connect.
        }
      },

      refresh: async () => {
        if (!liveConfigured()) return;
        // Coalesce concurrent refreshes — strict-mode mount + nav transitions
        // would otherwise fire two full fan-outs and trip the RPC rate limit.
        if (pendingRefresh) return pendingRefresh;
        pendingRefresh = (async () => {
          try {
            if (!client) getClient(isAddress(get().user) ? (get().user as Address) : undefined);
            // Stream each market into the store as it loads so the grid
            // fills progressively instead of blocking on the full fan-out.
            const finalMarkets = await loadLiveMarkets(get().user, (partial) => {
              set({ markets: partial, error: "", live: true });
            });
            // One last set in case nothing arrived (empty factory).
            set({ markets: finalMarkets, error: "", live: true });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : String(error) });
            throw error;
          } finally {
            pendingRefresh = null;
          }
        })();
        return pendingRefresh;
      },

      createMarket: async (question, category, resolutionDate) => {
        const effectiveCategory = inferMarketCategory(question, category);
        if (liveConfigured()) {
          const marketAddr = await deployContract(predictionMarketSource, [
            question,
            resolutionDate,
            effectiveCategory,
          ]);
          await write(env.marketFactory, "register_market", [marketAddr, effectiveCategory]);
          await get().refresh();
          return marketAddr;
        }

        const id = "m" + Math.random().toString(36).slice(2, 9);
        const m: Market = {
          id,
          question,
          category: effectiveCategory,
          creator: get().user,
          resolutionDate,
          totalYes: 0,
          totalNo: 0,
          bets: [],
          resolved: false,
          outcome: "",
          resolutionSources: [],
          createdAt: Date.now(),
        };
        set({ markets: [m, ...get().markets] });
        return id;
      },

      placeBet: async (marketId, side, amount) => {
        if (liveConfigured()) {
          await write(marketId, "place_bet", [side], parseEther(String(amount)));
          await get().refresh();
          return;
        }

        const markets = get().markets.map((m) => {
          if (m.id !== marketId) return m;
          const bet: Bet = { user: get().user, side, amount: amount * 1e18, ts: Date.now() };
          return {
            ...m,
            bets: [...m.bets, bet],
            totalYes: side === "YES" ? m.totalYes + amount * 1e18 : m.totalYes,
            totalNo: side === "NO" ? m.totalNo + amount * 1e18 : m.totalNo,
          };
        });
        set({ markets });
      },

      resolveMarket: async (marketId) => {
        if (liveConfigured()) {
          await write(marketId, "resolve_market");
          await get().refresh();
          return;
        }

        await new Promise((r) => setTimeout(r, 2500));
        const markets = get().markets.map((m) => {
          if (m.id !== marketId) return m;
          const yesProb = m.totalYes / Math.max(m.totalYes + m.totalNo, 1);
          const outcome: Outcome = yesProb > 0.55 ? "YES" : yesProb < 0.45 ? "NO" : "VOID";
          return {
            ...m,
            resolved: true,
            outcome,
            resolutionSources: [
              "https://www.reuters.com/markets/",
              "https://apnews.com/",
              "https://en.wikipedia.org/wiki/" + encodeURIComponent(m.question.slice(0, 32)),
            ],
            validatorVotes: {
              yes: outcome === "YES" ? 7 : 1,
              no: outcome === "NO" ? 7 : 1,
              void: outcome === "VOID" ? 7 : 1,
              total: 9,
            },
          };
        });
        set({ markets });
      },

      claimWinnings: async (marketId) => {
        const m = get().markets.find((x) => x.id === marketId);
        if (!m) throw new Error("Market not found in local state — try refreshing the page.");
        if (!m.resolved) {
          throw new Error(
            "Market not yet resolved. Validators haven't committed an outcome — try again after resolution."
          );
        }
        const me = get().user;
        const myBets = m.bets.filter((b) => b.user.toLowerCase() === me.toLowerCase());
        if (myBets.length === 0) {
          throw new Error(
            "No bet found for this wallet — either you didn't bet on this market or you already claimed."
          );
        }

        // VOID refunds the full stake. Otherwise only winning-side bets pay
        // out — anything on the losing side has nothing to claim.
        const onWinningSide =
          m.outcome === "VOID" || myBets.some((b) => b.side === m.outcome);
        if (!onWinningSide) {
          throw new Error(
            "Your bet is on the losing side. The contract has nothing to send — losing stakes go to the winners' pool."
          );
        }

        const estimate = (() => {
          if (m.outcome === "VOID") return myBets.reduce((s, b) => s + b.amount, 0) / 1e18;
          const winning = myBets.filter((b) => b.side === m.outcome);
          const winPool = m.outcome === "YES" ? m.totalYes : m.totalNo;
          const myStake = winning.reduce((s, b) => s + b.amount, 0);
          return (myStake * (m.totalYes + m.totalNo)) / Math.max(winPool, 1) / 1e18;
        })();

        if (liveConfigured()) {
          await write(marketId, "claim_winnings");
          await get().refresh();
          return estimate;
        }

        const markets = get().markets.map((x) =>
          x.id === marketId ? { ...x, bets: x.bets.filter((b) => b.user !== me) } : x
        );
        set({ markets });
        return estimate;
      },

      reset: () => set({ markets: seedMarkets() }),
    }),
    {
      // Bumping the storage key wipes stale identity from older sessions so
      // returning visitors don't hydrate back into a phantom "connected" state.
      name: "resolvex-store-v5",
      // Persist only the chosen wallet hint (`walletRdns` + `walletName`)
      // and mock-mode markets. NEVER persist `connected` or `user` — those
      // must be re-derived via `reconnectSilent()` at boot so a brand-new
      // visitor sees the Connect button while a returning user gets a
      // popup-free auto-reconnect if their wallet still authorizes the site.
      partialize: (state) =>
        state.live
          ? {
              walletRdns: state.walletRdns,
              walletName: state.walletName,
            }
          : {
              walletRdns: state.walletRdns,
              walletName: state.walletName,
              markets: state.markets,
            },
    }
  )
);
