"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useGenLayer } from "@/lib/genlayer";
import { Reveal } from "@/components/motion/Reveal";
import { Counter } from "@/components/motion/Counter";
import { WalletModal } from "@/components/WalletModal";
import { formatGen } from "@/lib/utils";
import { Wallet, ArrowUpRight } from "lucide-react";

export default function PortfolioPage() {
  const { markets, user, connected } = useGenLayer();
  const [walletOpen, setWalletOpen] = useState(false);

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
        <Wallet className="size-10 text-accent mx-auto mb-6" />
        <h1 className="headline text-3xl sm:text-5xl md:text-display-lg text-balance mb-3">
          Connect to see your <span className="italic text-fg-muted">positions.</span>
        </h1>
        <p className="text-sm sm:text-base text-fg-muted mb-8 max-w-md mx-auto">
          See every bet you've placed, every market you've created, and your
          unclaimed winnings.
        </p>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setWalletOpen(true)}
          className="btn-primary px-7 py-3.5 text-base"
        >
          Connect wallet
        </motion.button>
        {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} />}
      </div>
    );
  }

  // Ethereum addresses are case-insensitive — the contract returns lowercase
  // while wallets emit EIP-55 mixed-case, so we have to normalize before
  // comparing. Without this, "Markets created" perpetually reads zero.
  const me = user.toLowerCase();
  const eq = (addr: string) => addr.toLowerCase() === me;
  const myMarkets = markets.filter((m) => m.bets.some((b) => eq(b.user)));
  const created = markets.filter((m) => eq(m.creator));
  const totalStaked =
    myMarkets.reduce(
      (s, m) =>
        s +
        m.bets
          .filter((b) => eq(b.user))
          .reduce((ss, b) => ss + b.amount, 0),
      0
    ) / 1e18;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-20">
      <Reveal>
        <div className="mb-8 sm:mb-12">
          <span className="chip mb-4">
            <span className="size-1.5 rounded-full bg-yes animate-pulse-soft" />
            Live positions
          </span>
          <h1 className="headline text-3xl sm:text-5xl md:text-display-lg text-balance">
            Your portfolio.
          </h1>
          <p className="text-sm sm:text-base text-fg-muted mt-3">
            Every position you hold across ResolveX.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border mb-8 sm:mb-12">
          <BigStat label="Active markets" value={myMarkets.filter((m) => !m.resolved).length} />
          <BigStat
            label="Total staked"
            value={totalStaked}
            decimals={2}
            suffix=" GEN"
            accent
          />
          <BigStat label="Markets created" value={created.length} />
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-dim">
            Your bets
          </h2>
          {myMarkets.length > 0 && (
            <span className="text-[11px] text-fg-dim num">
              {myMarkets.length} position{myMarkets.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="card overflow-hidden">
          {myMarkets.length === 0 && (
            <div className="p-8 sm:p-16 text-center text-fg-muted">
              No bets yet.{" "}
              <Link href="/markets" className="text-accent link-underline">
                Browse markets →
              </Link>
            </div>
          )}
          {myMarkets.map((m, i) => {
            const myBets = m.bets.filter((b) => eq(b.user));
            const stake = myBets.reduce((s, b) => s + b.amount, 0);
            const sides = Array.from(new Set(myBets.map((b) => b.side))).join(", ");
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
              >
                <Link
                  href={`/markets/${m.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 sm:gap-4 p-4 sm:p-5 border-b border-border last:border-0 hover:bg-bg-elevated transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.question}</p>
                    <p className="text-xs text-fg-dim mt-1 num">
                      on {sides} · {m.bets.length} total bets
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2 sm:gap-3 shrink-0">
                    <div>
                      <div className="num text-xs sm:text-sm whitespace-nowrap">
                        {formatGen(BigInt(stake))} GEN
                      </div>
                      <div
                        className={
                          m.resolved
                            ? "text-[11px] text-yes num"
                            : "text-[11px] text-fg-dim"
                        }
                      >
                        {m.resolved ? `Resolved · ${m.outcome}` : "Active"}
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 text-fg-dim group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}

function BigStat({
  label,
  value,
  decimals = 0,
  suffix = "",
  accent,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-bg-card p-5 sm:p-7">
      <div className={`num text-2xl sm:text-4xl ${accent ? "text-accent" : "text-fg"}`}>
        <Counter to={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-fg-dim mt-2">
        {label}
      </div>
    </div>
  );
}
