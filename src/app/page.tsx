"use client";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useGenLayer } from "@/lib/genlayer";
import { MarketCard } from "@/components/MarketCard";
import { Counter } from "@/components/motion/Counter";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import {
  ArrowRight,
  Brain,
  Globe,
  ShieldCheck,
  Users,
  Zap,
  ArrowUpRight,
} from "lucide-react";

export default function Home() {
  const { markets } = useGenLayer();
  const featured = markets.slice(0, 6);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  const activeMarkets = markets.filter((m) => !m.resolved).length;
  const totalVolume = markets.reduce(
    (s, m) => s + (m.totalYes + m.totalNo) / 1e18,
    0
  );

  return (
    <div>
      {/* HERO */}
      <motion.section
        ref={heroRef}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-mesh-warm" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-50" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 md:pt-16 pb-20 md:pb-32"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-8"
          >
            <span className="chip">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              Now live on GenLayer Testnet Asimov
            </span>
          </motion.div>

          <h1 className="headline text-4xl sm:text-5xl md:text-7xl lg:text-display-2xl text-center max-w-5xl mx-auto text-balance">
            Markets that
            <br />
            <span className="italic text-accent relative inline-block">
              resolve themselves
              <motion.svg
                viewBox="0 0 300 12"
                className="absolute -bottom-2 left-0 w-full"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.4, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.path
                  d="M2 8 Q 75 2, 150 7 T 298 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </motion.svg>
            </span>
            .
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-fg-muted max-w-2xl mx-auto text-center text-balance leading-relaxed px-2"
          >
            ResolveX bets are settled by AI validators that read live web data
            and reach consensus on-chain. No oracles. No human arbiters. Just truth,
            on demand.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto"
          >
            <Link href="/markets" className="btn-primary text-sm sm:text-base px-6 py-3 group justify-center">
              Explore markets
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/create" className="btn-secondary text-sm sm:text-base px-6 py-3 justify-center">
              Create a market
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-14 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border max-w-4xl mx-auto"
          >
            <HeroStat label="Active markets" value={activeMarkets} />
            <HeroStat
              label="Total volume"
              value={totalVolume}
              decimals={1}
              suffix=" GEN"
            />
            <HeroStat label="Validators" value={9} />
            <HeroStat label="Oracles needed" value={0} accent />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-10 sm:mb-14 flex-wrap">
            <div>
              <span className="chip mb-4">
                <span className="size-1.5 rounded-full bg-accent" />
                How resolution works
              </span>
              <h2 className="headline text-3xl sm:text-5xl md:text-display-lg max-w-2xl text-balance">
                One contract. Four steps.
                <br />
                <span className="text-fg-muted italic">Zero trust required.</span>
              </h2>
            </div>
            <p className="text-sm sm:text-base text-fg-muted max-w-sm text-pretty">
              Every market is a self-resolving Intelligent Contract on GenLayer.
              The protocol does the rest.
            </p>
          </div>
        </Reveal>

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StaggerItem>
            <Step
              icon={<Zap className="size-4" />}
              n="01"
              title="Ask in plain English"
              body="Phrase the question, pick a category and a resolution date. The market deploys to GenLayer in seconds."
            />
          </StaggerItem>
          <StaggerItem>
            <Step
              icon={<Users className="size-4" />}
              n="02"
              title="Pools form"
              body="Anyone can take YES or NO. Implied odds update live as capital flows into either side."
            />
          </StaggerItem>
          <StaggerItem>
            <Step
              icon={<Globe className="size-4" />}
              n="03"
              title="Validators read the web"
              body="On the resolution date, gl.get_webpage() pulls live data from news, sports, financial APIs."
            />
          </StaggerItem>
          <StaggerItem>
            <Step
              icon={<Brain className="size-4" />}
              n="04"
              title="AI reaches consensus"
              body="An LLM verdict is re-run by every validator. Optimistic Democracy locks the outcome on-chain."
            />
          </StaggerItem>
        </Stagger>
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <Reveal>
          <div className="flex items-end justify-between mb-8 sm:mb-10 flex-wrap gap-4">
            <div>
              <span className="chip mb-4">
                <span className="size-1.5 rounded-full bg-yes" />
                Trending now
              </span>
              <h2 className="headline text-3xl sm:text-5xl md:text-display-lg text-balance">
                Featured markets
              </h2>
            </div>
            <Link
              href="/markets"
              className="text-sm text-fg-muted hover:text-accent flex items-center gap-1.5 link-underline"
            >
              Browse all markets
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((m, i) => (
            <MarketCard key={m.id} m={m} index={i} />
          ))}
        </div>
      </section>

      {/* WHY / MANIFESTO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <div className="card relative overflow-hidden p-6 sm:p-10 md:p-16 lg:p-20">
            <div className="absolute -top-40 -right-40 size-96 bg-accent/15 rounded-full blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 size-96 bg-info/10 rounded-full blur-[120px]" />

            <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-8 sm:gap-12 items-end">
              <div>
                <ShieldCheck className="size-10 text-accent mb-6" />
                <h2 className="headline text-3xl sm:text-5xl md:text-display-lg text-balance">
                  Oracles have cost DeFi <span className="italic text-no">$100M+</span>.
                  <br />
                  We removed them.
                </h2>
                <p className="mt-6 text-fg-muted max-w-2xl text-pretty leading-relaxed">
                  Every existing prediction market, Polymarket, Augur, Manifold,
                  has a single point of failure: humans or centralized oracles
                  calling the outcome. ResolveX moves resolution entirely on-chain,
                  into a quorum of AI validators anyone can audit.
                </p>
                <Link
                  href="/create"
                  className="btn-primary mt-8 text-base px-6 py-3 group"
                >
                  Create your first market
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border">
                <ManifestoStat k="Validators per market" v="9" />
                <ManifestoStat k="Consensus threshold" v="6/9" />
                <ManifestoStat k="Human arbiters" v="0" accent />
                <ManifestoStat k="Trust assumptions" v="None" accent />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function HeroStat({
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
    <div className="bg-bg p-4 sm:p-6 flex flex-col gap-1">
      <div className={`num text-2xl sm:text-3xl md:text-4xl ${accent ? "text-accent" : "text-fg"}`}>
        <Counter to={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="text-[11px] uppercase tracking-[0.15em] text-fg-dim">{label}</div>
    </div>
  );
}

function ManifestoStat({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-bg-card p-5">
      <div className={`num text-2xl ${accent ? "text-accent" : "text-fg"}`}>{v}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-fg-dim mt-1">{k}</div>
    </div>
  );
}

function Step({
  icon,
  n,
  title,
  body,
}: {
  icon: React.ReactNode;
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="relative card p-6 h-full overflow-hidden group transition-all duration-300 border-border hover:border-accent/40 hover:shadow-glow-sm">
      <span className="absolute -top-12 -right-12 size-32 rounded-full bg-accent/0 blur-3xl group-hover:bg-accent/15 transition-colors duration-500" />
      <div className="relative flex items-center justify-between mb-6">
        <span className="grid place-items-center size-9 rounded-lg border border-border bg-bg-elevated text-fg-muted transition-colors duration-300 group-hover:border-accent/40 group-hover:bg-accent/10 group-hover:text-accent">
          {icon}
        </span>
        <span className="num text-[11px] text-fg-dim tracking-widest">{n}</span>
      </div>
      <h3 className="relative font-medium mb-2 text-[15px]">{title}</h3>
      <p className="relative text-sm text-fg-muted leading-relaxed">{body}</p>
    </div>
  );
}
