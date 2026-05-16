# ResolveX

Trustless prediction markets and P2P bets, resolved autonomously by GenLayer
Intelligent Contracts. No oracles. No human arbiters.

> The #1 failure point in existing prediction markets (Polymarket, Augur,
> Manifold) is centralized or human-dependent outcome resolution. ResolveX
> moves resolution entirely into a quorum of AI validators that anyone can audit.

---

## Architecture

```
┌────────────────────────────┐         ┌─────────────────────────────────┐
│  Next.js 14 frontend       │ ──────▶ │  GenLayer Testnet Asimov        │
│  (App Router · Tailwind)   │ wagmi   │                                 │
│  src/                      │ genlayer│  MarketFactory.py               │
│   ├ app/                   │   -js   │     │ deploys                   │
│   ├ components/            │ ◀────── │     ▼                           │
│   └ lib/genlayer.ts (SDK)  │ events  │  PredictionMarket.py  ◀── core  │
└────────────────────────────┘         │     │ gl.get_webpage()          │
                                       │     │ gl.eq_principle_prompt    │
                                       │     ▼                           │
                                       │  P2PBet.py    ReputationTracker │
                                       └─────────────────────────────────┘
```

### Intelligent Contracts (Python — `contracts/`)

| Contract | Purpose |
| --- | --- |
| `market_factory.py` | Deploys & indexes every `PredictionMarket`. |
| `prediction_market.py` | YES/NO market. Self-resolves via web data + LLM + Equivalence Principle. |
| `p2p_bet.py` | 1-vs-1 direct wagers. Same AI resolution pipeline. |
| `reputation_tracker.py` | On-chain accuracy leaderboard. |

The core method is `PredictionMarket.resolve_market()`. It:

1. Calls `gl.get_webpage(...)` against multiple search/news/wiki URLs.
2. Feeds the question + scraped text into `gl.eq_principle_prompt_comparative(...)`.
3. Every validator must converge on the same one-word verdict (`YES`, `NO`, `VOID`)
   for it to commit on-chain. Disagreement triggers appeals to a larger committee.

### Frontend pages

| Route | Purpose |
| --- | --- |
| `/` | Hero, how-it-works, featured markets |
| `/markets` | Browse + filter all markets |
| `/markets/[id]` | Place bets, view odds, trigger resolution, claim winnings |
| `/create` | Deploy a market in plain English |
| `/p2p` | Open P2P challenges |
| `/p2p/create` | Lock a wager and publish a challenge |
| `/p2p/[id]` | Accept / cancel / resolve a P2P bet |
| `/portfolio` | Your bets, stakes, history |
| `/leaderboard` | Top predictors by accuracy |

---

## Setup

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# leave NEXT_PUBLIC_GENLAYER_MODE=mock for local UI-only demos
# or set GENLAYER_PRIVATE_KEY before deploying live contracts

# 3. Run
npm run dev
```

The app defaults to an in-memory mock GenLayer store so the entire UI is usable
without a wallet. Set `NEXT_PUBLIC_GENLAYER_MODE=live` and deployed contract
addresses to switch the same UI to real `genlayer-js` reads and writes.

### Deploying contracts

```bash
# 1. Put a funded deployer key in .env.local.
GENLAYER_PRIVATE_KEY=0x...

# 2. Deploy MarketFactory and ReputationTracker.
npm run genlayer:deploy

# 3. The script writes these values back to .env.local.
NEXT_PUBLIC_GENLAYER_MODE=live
NEXT_PUBLIC_MARKET_FACTORY_ADDR=0x...
NEXT_PUBLIC_REPUTATION_ADDR=0x...
```

`MarketFactory` now embeds the `PredictionMarket` and `P2PBet` Python source at
deployment time, then deploys and indexes child market/P2P contracts on-chain.

### Live resolution smoke test

After deploying, run:

```bash
npm run genlayer:live-check
```

This creates a tiny test market, places a small YES stake, triggers
`resolve_market()`, waits for GenLayer acceptance, and prints the resolved
contract state. Override the defaults with `GENLAYER_TEST_QUESTION`,
`GENLAYER_TEST_RESOLUTION_DATE`, and `GENLAYER_TEST_STAKE`.

---

## Theme

Dark theme inspired by [genlayer.com](https://www.genlayer.com) in dark mode:

| Token | Hex |
| --- | --- |
| Background | `#000000` |
| Card surface | `#0F0F11` |
| Border | `#1F1F23` |
| Foreground | `#FAFAFA` |
| **Accent (lime)** | `#C2FF3D` |
| Violet glow | `#7C5CFF` |

All tokens live in `tailwind.config.ts`.

---

## GenLayer integration points

ResolveX is impossible without GenLayer. It uses:

- `gl.get_webpage()` — live web data inside an on-chain transaction.
- `gl.eq_principle_prompt_comparative()` — LLM call gated by the Equivalence Principle.
- `gl.deploy_contract()` — factory pattern for per-market contracts.
- `gl.emit_event()` — surfaced in the frontend feeds.
- Optimistic Democracy — multi-validator consensus on every resolution.

---

## Deliverables checklist

- [x] Four Intelligent Contracts written in Python for GenLayer
- [x] Next.js 14 frontend with full pages and components
- [x] GenLayer dark theme palette
- [x] Mock SDK layer for instant local demo
- [ ] Live deployment to GenLayer Testnet Asimov (post-build step)
- [ ] Demo video (post-build step)

---

## Stretch goals (in scope but not built)

- AMM liquidity pools so every market has baseline liquidity.
- Multi-outcome markets (pick 1 of N).
- Shareable challenge links.
- Push notifications on resolution.
- Token rewards for top reputation scores.
