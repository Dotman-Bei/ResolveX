import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0A0C",
          subtle: "#0E0E12",
          surface: "#101015",
          card: "#13131A",
          elevated: "#1A1A22",
        },
        border: {
          DEFAULT: "#23232D",
          strong: "#2E2E3A",
          glow: "#3A3A4A",
        },
        fg: {
          DEFAULT: "#F8F8F5",
          muted: "#A8A8B2",
          dim: "#646470",
          faint: "#3A3A44",
        },
        accent: {
          DEFAULT: "#FF6B35",
          hover: "#FF8255",
          dim: "#C24A1E",
          soft: "rgba(255,107,53,0.12)",
        },
        yes: {
          DEFAULT: "#3DDC97",
          soft: "rgba(61,220,151,0.12)",
        },
        no: {
          DEFAULT: "#FF4D6D",
          soft: "rgba(255,77,109,0.12)",
        },
        info: {
          DEFAULT: "#7C9CFF",
          soft: "rgba(124,156,255,0.12)",
        },
        warning: "#FFC857",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "display-2xl": ["clamp(3.5rem, 8vw, 7rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "display-xl": ["clamp(2.5rem, 5vw, 4.5rem)", { lineHeight: "1", letterSpacing: "-0.035em" }],
        "display-lg": ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
      },
      boxShadow: {
        glow: "0 0 50px -12px rgba(255,107,53,0.45)",
        "glow-sm": "0 0 24px -8px rgba(255,107,53,0.35)",
        "glow-yes": "0 0 24px -8px rgba(61,220,151,0.4)",
        "glow-no": "0 0 24px -8px rgba(255,77,109,0.4)",
        elevated: "0 16px 40px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
      },
      backgroundImage: {
        "mesh-warm":
          "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,107,53,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 30%, rgba(124,156,255,0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 10% 80%, rgba(61,220,151,0.08), transparent 60%)",
        "grid-dots":
          "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        ticker: "ticker 60s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
