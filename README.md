# RESOLVEX README

**Trustless prediction markets on GenLayer — where the contract resolves itself.**

Every market is a GenLayer Intelligent Contract. A quorum of AI validators fetches live web data, runs an LLM verdict under the Equivalence Principle, and converges on `YES`, `NO`, or `VOID` before a single payout clears. No oracles. No human juries. No multisig committees.

## The Core Innovation

ResolveX inverts the resolution model that every existing prediction market relies on. Polymarket, Augur, and Manifold all ultimately route disputed outcomes to centralized operators or human juries — "the very layer the market was supposed to remove." On ResolveX, the market resolves itself. The contract calls `gl.get_webpage()` against a curated set of search, news, and reference URLs, hands the evidence to `gl.eq_principle_prompt_comparative()`, and "requires every validator in the active committee to converge on the same one-word verdict before the result is committed on-chain." Disagreement escalates to a larger appeals committee under GenLayer's Optimistic Democracy. The audit trail is the chain.

## Technical Stack

- **Settlement:** GenLayer Testnet Asimov
- **Contracts:** Python Intelligent Contracts (`MarketFactory`, `PredictionMarket`, `P2PBet`, `ReputationTracker`)
- **Resolution:** `gl.get_webpage()` + `gl.eq_principle_prompt_comparative()` inside a single transaction
- **Frontend:** Next.js 14 (App Router), Tailwind, Zustand, Framer Motion
- **SDK:** `genlayer-js` for reads/writes, `wagmi` + RainbowKit for wallets
- **Mock mode:** in-memory store mirroring the live contract interface — full app runs without a wallet or RPC

## Resolution Workflow

On `resolve_market()` the contract reads a curated set of URLs via `gl.get_webpage()`, passes the question and scraped evidence into the Equivalence Principle prompt, and waits for committee convergence on one of `YES` / `NO` / `VOID`. If validators disagree, the call escalates to an appeals committee. Once consensus is reached the verdict is committed on-chain, `ReputationTracker` updates predictor accuracy, and winners can claim. Every step is a signed transaction with verifiable reasoning.

## Contracts

Source lives in [contracts/](contracts/).

- [`market_factory.py`](contracts/market_factory.py) — deploys and indexes every `PredictionMarket` and `P2PBet`.
- [`prediction_market.py`](contracts/prediction_market.py) — YES/NO market. Self-resolves via live web data + LLM verdict + Equivalence Principle.
- [`p2p_bet.py`](contracts/p2p_bet.py) — one-versus-one direct wagers on the same resolution pipeline.
- [`reputation_tracker.py`](contracts/reputation_tracker.py) — on-chain accuracy leaderboard.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app boots in **mock mode** by default (`NEXT_PUBLIC_GENLAYER_MODE=mock`). Every page, action, and resolution flow is exercisable without a wallet, RPC connection, or testnet funds.

To run against deployed contracts, set `NEXT_PUBLIC_GENLAYER_MODE=live`, supply `NEXT_PUBLIC_MARKET_FACTORY_ADDR` and `NEXT_PUBLIC_REPUTATION_ADDR`, then:

```bash
GENLAYER_PRIVATE_KEY=0x... npm run genlayer:deploy
npm run genlayer:live-check
```

The smoke test creates a market, places a stake, triggers resolution, waits for consensus, and prints the resolved state.

## Status

Live-ready on GenLayer Testnet Asimov with four Intelligent Contracts, a full Next.js frontend, a deploy script, and an end-to-end resolution smoke test. AMM liquidity pools, multi-outcome markets, shareable P2P challenge links, and reputation-tied token rewards are roadmap for v1.1.
