"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Category, inferMarketCategory, useGenLayer } from "@/lib/genlayer";
import { Reveal } from "@/components/motion/Reveal";
import { WalletModal } from "@/components/WalletModal";
import { Wand2, Calendar, Tag, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { friendlyWalletError, type FriendlyError } from "@/lib/walletErrors";

const examples = [
  "Will Bitcoin reach $200,000 before January 2027?",
  "Will the Super Eagles qualify for the 2026 FIFA World Cup?",
  "Will Burna Boy win a Grammy in 2027?",
  "Will Ethereum flip Bitcoin's market cap by 2028?",
  "Will SpaceX land humans on Mars before 2030?",
  "Will GTA VI launch before December 2026?",
];

const cats: { key: Category; label: string }[] = [
  { key: "crypto", label: "Crypto" },
  { key: "sports", label: "Sports" },
  { key: "politics", label: "Politics" },
  { key: "entertainment", label: "Culture" },
  { key: "tech", label: "Tech" },
  { key: "world", label: "World" },
];

export default function CreatePage() {
  const router = useRouter();
  const { createMarket, connected } = useGenLayer();
  const [walletOpen, setWalletOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [cat, setCat] = useState<Category>("world");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  // Default to 23:59 — preserves the old "end of day" semantics until the
  // user explicitly picks a moment.
  const [time, setTime] = useState("23:59");
  const [submitting, setSubmitting] = useState(false);
  const [deployError, setDeployError] = useState<FriendlyError | null>(null);

  // Combine date + time as a local-timezone moment and serialize to ISO. This
  // is what `<Countdown />` and `ResolutionPanel` compare against `Date.now()`.
  const resolutionMs = (() => {
    if (!date || !time) return NaN;
    const [y, mo, d] = date.split("-").map(Number);
    const [h, mi] = time.split(":").map(Number);
    return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
  })();
  const inFuture = !Number.isNaN(resolutionMs) && resolutionMs > Date.now();

  const submit = async () => {
    if (!connected) {
      setWalletOpen(true);
      return;
    }
    if (question.trim().length < 10) return;
    if (!inFuture) return;
    setSubmitting(true);
    setDeployError(null);
    try {
      await createMarket(
        question.trim(),
        cat,
        new Date(resolutionMs).toISOString()
      );
      router.push("/markets?notice=market-created");
    } catch (error) {
      setDeployError(friendlyWalletError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24">
      <Reveal>
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="headline text-3xl sm:text-5xl md:text-display-lg text-balance">
            Phrase a question.
            <br />
            <span className="italic text-fg-muted">Let the network answer it.</span>
          </h1>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="card p-5 sm:p-7 md:p-8 space-y-6 sm:space-y-7">
          {/* Question */}
          <div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-fg-dim mb-3">
              <span className="num">01</span>
              <span className="size-px flex-1 bg-border" />
              <span>The prediction</span>
            </label>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => {
                const next = e.target.value;
                setQuestion(next);
                setCat(inferMarketCategory(next, cat));
              }}
              placeholder="e.g. Will Bitcoin reach $200,000 before January 2027?"
              className="input resize-none headline text-lg sm:text-2xl md:text-3xl leading-snug py-3 sm:py-4 placeholder:text-fg-faint"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setQuestion(ex);
                    setCat(inferMarketCategory(ex, cat));
                  }}
                  className="chip hover:border-accent hover:text-accent transition-colors text-[11px]"
                >
                  <Wand2 className="size-3" />
                  <span className="truncate max-w-[14rem] sm:max-w-none">
                    {ex.length > 40 ? `${ex.slice(0, 40)}…` : ex}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-fg-dim mb-3">
              <span className="num">02</span>
              <span className="size-px flex-1 bg-border" />
              <span className="flex items-center gap-1.5">
                <Tag className="size-3" /> Category
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCat(c.key)}
                  className={cn(
                    "relative px-4 py-2 rounded-full text-sm tracking-tight transition-colors",
                    cat === c.key ? "text-bg" : "text-fg-muted hover:text-fg"
                  )}
                >
                  {cat === c.key && (
                    <motion.span
                      layoutId="create-cat"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-accent"
                    />
                  )}
                  <span className="relative">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + time */}
          <div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-fg-dim mb-3">
              <span className="num">03</span>
              <span className="size-px flex-1 bg-border" />
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3" /> Resolution date &amp; time
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-fg-dim" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input num text-base pl-10"
                />
              </div>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-fg-dim" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  step={60}
                  className="input num text-base pl-10"
                />
              </div>
            </div>
            {!Number.isNaN(resolutionMs) && (
              <p
                className={cn(
                  "mt-2 text-[11px] num leading-snug break-words",
                  inFuture ? "text-fg-dim" : "text-no"
                )}
              >
                {inFuture
                  ? `Resolves ${new Date(resolutionMs).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short",
                    })}`
                  : "Resolution time must be in the future."}
              </p>
            )}
          </div>

          {/* Tip */}
          <div className="bg-bg-elevated/60 border border-border rounded-xl p-4 text-xs text-fg-muted leading-relaxed space-y-1.5">
            <p>
              <span className="text-accent font-medium">Tip ·</span> Questions
              resolve best when they reference a specific, verifiable event with a
              date — something a search engine or news outlet will report on.
            </p>
            <p>
              <span className="text-accent font-medium">When · </span>
              The market becomes ready to resolve at the exact local time you
              pick. Choose a moment <em>after</em> the event you&apos;re asking
              about so the answer is publicly verifiable.
            </p>
          </div>

          {deployError && (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs",
                deployError.cancelled
                  ? "border-border bg-bg-elevated text-fg-muted"
                  : "border-no/30 bg-no/10 text-no"
              )}
              role="alert"
            >
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium leading-snug">{deployError.title}</p>
                <p
                  className={cn(
                    "leading-snug mt-0.5",
                    deployError.cancelled ? "text-fg-dim" : "text-no/90"
                  )}
                >
                  {deployError.detail}
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            disabled={submitting || question.trim().length < 10 || !inFuture}
            onClick={submit}
            className="btn-primary w-full py-3.5 sm:py-4 text-sm sm:text-base justify-center"
          >
            {connected
              ? submitting
                ? "Deploying contract…"
                : "Deploy market"
              : "Connect wallet to deploy"}
          </motion.button>
        </div>
      </Reveal>
      {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} />}
    </div>
  );
}
