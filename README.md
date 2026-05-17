# ResolveX

**Trustless prediction markets and peer-to-peer wagers, resolved autonomously by GenLayer Intelligent Contracts.** No oracles. No human arbiters. No multisig committees.

ResolveX addresses the single largest failure mode of existing prediction markets — Polymarket, Augur, Manifold — where outcome resolution ultimately depends on centralized operators or human juries. By delegating resolution to a quorum of AI validators running deterministic web lookups under GenLayer's Equivalence Principle, every market settles through a transparent, auditable consensus process.

---

## Table of contents

- [Architecture](#architecture)
- [Intelligent Contracts](#intelligent-contracts)
- [Frontend](#frontend)
- [Getting started](#getting-started)
- [Deploying to GenLayer Testnet](#deploying-to-genlayer-testnet)
- [Live resolution smoke test](#live-resolution-smoke-test)
- [GenLayer integration](#genlayer-integration)
- [Design system](#design-system)
- [Project status](#project-status)
- [Roadmap](#roadmap)

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

The frontend communicates with on-chain contracts through `genlayer-js` for reads and writes, and `wagmi` for wallet management. A mock SDK layer mirrors the live contract interface, so the entire UI is fully functional without a wallet or network connection.

---

## Intelligent Contracts

Written in Python and deployed to GenLayer. Source lives in [contracts/](contracts/).

| Contract | Responsibility |
| --- | --- |
| [`market_factory.py`](contracts/market_factory.py) | Deploys and indexes every `PredictionMarket` and `P2PBet`. |
| [`prediction_market.py`](contracts/prediction_market.py) | YES/NO market. Self-resolves via live web data, an LLM verdict, and the Equivalence Principle. |
| [`p2p_bet.py`](contracts/p2p_bet.py) | One-versus-one direct wagers using the same AI resolution pipeline. |
| [`reputation_tracker.py`](contracts/reputation_tracker.py) | On-chain accuracy leaderboard. |

### Resolution pipeline

The core entry point is `PredictionMarket.resolve_market()`. On invocation it:

1. Calls `gl.get_webpage(...)` against a curated set of search, news, and reference URLs.
2. Passes the question and scraped evidence into `gl.eq_principle_prompt_comparative(...)`.
3. Requires every validator in the active committee to converge on the same one-word verdict — `YES`, `NO`, or `VOID` — before the result is committed on-chain.
4. Escalates disagreement to a larger appeals committee under GenLayer's Optimistic Democracy.

This pipeline produces deterministic, audit-friendly outcomes without trusting any single oracle, operator, or model invocation.

---

## Frontend

Built with Next.js 14 (App Router), Tailwind CSS, Zustand, and Framer Motion.

| Route | Purpose |
| --- | --- |
| `/` | Landing page with hero, how-it-works, and featured markets. |
| `/markets` | Browse and filter all active markets. |
| `/markets/[id]` | Place bets, view live odds, trigger resolution, and claim winnings. |
| `/create` | Deploy a new market from a plain-English question. |
| `/p2p` | Browse open peer-to-peer challenges. |
| `/p2p/create` | Lock a stake and publish a challenge. |
| `/p2p/[id]` | Accept, cancel, or resolve a peer-to-peer bet. |
| `/portfolio` | Personal bets, stakes, and history. |
| `/leaderboard` | Top predictors ranked by reputation. |

---

## Getting started

### Prerequisites

- Node.js 18.17 or newer
- npm 9+
- (Optional) A funded GenLayer Testnet Asimov account for live deployments

### Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app boots in **mock mode** by default (`NEXT_PUBLIC_GENLAYER_MODE=mock`), backed by an in-memory store that mirrors the live contract interface. Every page, action, and resolution flow is exercisable without a wallet, RPC connection, or testnet funds.

To run against deployed contracts, set `NEXT_PUBLIC_GENLAYER_MODE=live` and supply the relevant contract addresses in `.env.local`.

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_GENLAYER_MODE` | `mock` or `live`. Controls whether the SDK uses the in-memory store or GenLayer RPC. |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | GenLayer network identifier (default: `testnetAsimov`). |
| `NEXT_PUBLIC_GENLAYER_RPC` | GenLayer RPC endpoint. |
| `NEXT_PUBLIC_GENLAYER_CONSENSUS_ADDR` | Consensus contract address. |
| `NEXT_PUBLIC_MARKET_FACTORY_ADDR` | Deployed `MarketFactory` address. |
| `NEXT_PUBLIC_REPUTATION_ADDR` | Deployed `ReputationTracker` address. |
| `GENLAYER_PRIVATE_KEY` | **Server-side only.** Used by deploy and test scripts. Never expose as `NEXT_PUBLIC_*`. |
| `GENLAYER_TEST_STAKE` | Default stake used by the live resolution smoke test. |

---

## Deploying to GenLayer Testnet

```bash
# 1. Add a funded deployer key to .env.local
GENLAYER_PRIVATE_KEY=0x...

# 2. Deploy MarketFactory and ReputationTracker
npm run genlayer:deploy
```

The deploy script writes the resulting addresses back into `.env.local`:

```env
NEXT_PUBLIC_GENLAYER_MODE=live
NEXT_PUBLIC_MARKET_FACTORY_ADDR=0x...
NEXT_PUBLIC_REPUTATION_ADDR=0x...
```

`MarketFactory` embeds the `PredictionMarket` and `P2PBet` Python source at deploy time, then deploys and indexes child contracts on demand from the frontend.

---

## Live resolution smoke test

After deploying, validate the full resolution pipeline end-to-end:

```bash
npm run genlayer:live-check
```

The script:

1. Creates a small test market.
2. Places a YES stake.
3. Triggers `resolve_market()`.
4. Waits for GenLayer consensus acceptance.
5. Prints the resolved contract state.

Override defaults with `GENLAYER_TEST_QUESTION`, `GENLAYER_TEST_RESOLUTION_DATE`, and `GENLAYER_TEST_STAKE`.

---

## GenLayer integration

ResolveX is impossible to build on a conventional EVM stack. It leans on the following GenLayer primitives:

- **`gl.get_webpage()`** — live web data fetched inside an on-chain transaction.
- **`gl.eq_principle_prompt_comparative()`** — LLM inference gated by the Equivalence Principle for deterministic consensus.
- **`gl.deploy_contract()`** — factory pattern for per-market child contracts.
- **`gl.emit_event()`** — surfaced in the frontend market feeds.
- **Optimistic Democracy** — multi-validator consensus on every resolution, with appeals on disagreement.

---

## Design system

A dark theme inspired by [genlayer.com](https://www.genlayer.com).

| Token | Hex |
| --- | --- |
| Background | `#000000` |
| Card surface | `#0F0F11` |
| Border | `#1F1F23` |
| Foreground | `#FAFAFA` |
| **Accent (lime)** | `#C2FF3D` |
| Violet glow | `#7C5CFF` |

All tokens are centralized in [tailwind.config.ts](tailwind.config.ts).

---

## Project status

- [x] Four Intelligent Contracts written in Python for GenLayer
- [x] Next.js 14 frontend with full routing, components, and state
- [x] GenLayer-aligned dark theme and design system
- [x] Mock SDK layer for instant local demo without a wallet
- [x] Deployment scripts and live resolution smoke test
- [ ] Production deployment to GenLayer Testnet Asimov
- [ ] Public demo video

---

## Roadmap

In scope but not yet implemented:

- AMM liquidity pools so every market launches with baseline liquidity.
- Multi-outcome markets (pick 1 of N).
- Shareable peer-to-peer challenge links.
- Push notifications on resolution.
- Token rewards tied to reputation scores.

---

## License

This project is released for the GenLayer hackathon. See repository for license details.
