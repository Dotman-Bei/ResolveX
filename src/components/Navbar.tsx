"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useGenLayer } from "@/lib/genlayer";
import { cn } from "@/lib/utils";
import { Wallet, ArrowUpRight, Menu, X } from "lucide-react";
import { WalletModal } from "./WalletModal";
import { AccountMenu } from "./AccountMenu";

const links = [
  { href: "/", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/create", label: "Create" },
  { href: "/portfolio", label: "Portfolio" },
];

export function Navbar() {
  const rawPath = usePathname();
  const path = rawPath ?? "/";
  const { connected } = useGenLayer();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [path]);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        // Only flip the surface treatment after mount — the server render
        // can't know the scroll position, so anchor the SSR output to the
        // "not scrolled" state and let the effect upgrade it on the client.
        mounted && scrolled
          ? "glass border-b border-border/80"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        <span
          className="shrink-0 font-semibold tracking-tight text-[15px] leading-none select-none"
          aria-label="ResolveX"
        >
          Resolve<span className="text-accent text-[1.45em] font-bold align-[-0.08em]">X</span>
        </span>

        <div className="hidden md:flex items-center gap-1 relative">
          {links.map((l) => {
            const active = path === l.href || path.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative px-4 py-2 rounded-full text-sm tracking-tight transition-colors",
                  active ? "text-fg" : "text-fg-muted hover:text-fg"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-bg-elevated border border-accent/30 shadow-[0_0_24px_-6px_rgba(255,107,53,0.45)]"
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {connected ? (
              <AccountMenu key="connected" />
            ) : (
              <motion.button
                key="disconnected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setWalletOpen(true)}
                className="btn-primary group"
              >
                <Wallet className="size-3.5" />
                <span className="hidden xs:inline sm:inline">Connect</span>
                <ArrowUpRight className="size-3.5 -ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="md:hidden grid place-items-center size-9 rounded-lg border border-border bg-bg-elevated text-fg hover:text-accent transition-colors"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-t border-border bg-bg/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map((l) => {
                const active = path === l.href || path.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-sm tracking-tight transition-colors",
                      active
                        ? "bg-bg-elevated text-fg border border-accent/30"
                        : "text-fg-muted hover:text-fg hover:bg-bg-elevated"
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} />}
    </motion.nav>
  );
}
