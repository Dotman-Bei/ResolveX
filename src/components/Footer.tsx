import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-20 sm:mt-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8 md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <Logo size={26} withWordmark />

            <p className="mt-4 text-sm text-fg-muted max-w-xs leading-relaxed">
              Prediction markets that resolve themselves. Built on GenLayer Intelligent
              Contracts.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              { href: "/markets", label: "Markets" },
              { href: "/create", label: "Create market" },
              { href: "/portfolio", label: "Portfolio" },
            ]}
          />
          <FooterCol
            title="Network"
            links={[
              { href: "https://genlayer.com", label: "GenLayer", external: true },
              {
                href: "https://portal.genlayer.foundation/#/builders/resources",
                label: "Builder resources",
                external: true,
              },
            ]}
          />
          <FooterCol
            title="Resolution"
            links={[
              { href: "#how", label: "How it works" },
              { href: "/markets?status=resolved", label: "Resolved markets" },
            ]}
          />
        </div>

        <div className="divider my-8 sm:my-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-fg-dim">
          <span>© {new Date().getFullYear()} ResolveX — settled by AI consensus.</span>
          <span className="num tracking-wider uppercase">
            Live on GenLayer Testnet Asimov
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-[0.18em] text-fg-dim mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noreferrer" : undefined}
              className="text-sm text-fg-muted hover:text-fg link-underline"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
