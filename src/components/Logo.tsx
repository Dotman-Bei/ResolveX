import { cn } from "@/lib/utils";

interface LogoProps {
  /** Pixel size of the mark (width = height). Defaults to 32. */
  size?: number;
  /** When true, render the "ResolveX" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
}

/**
 * ResolveX brand mark.
 *
 * The mark is a rotated square (a consensus node — every validator
 * contributing to the verdict) with an integrated checkmark stroke
 * (the resolved outcome). All strokes are `currentColor` so it
 * inherits from the surrounding text color and works on any surface.
 */
export function Logo({ size = 32, withWordmark = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={size} />
      {withWordmark && (
        <span
          className="font-semibold tracking-tight leading-none"
          style={{ fontSize: Math.round(size * 0.5) }}
        >
          Resolve
          <span className="text-accent text-[1.45em] font-bold align-[-0.08em]">
            X
          </span>
        </span>
      )}
    </span>
  );
}

function Mark({ size }: { size: number }) {
  return (
    <span
      className="relative inline-grid place-items-center shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Soft accent halo for visual lift on dark backgrounds */}
      <span
        className="absolute inset-0 rounded-[28%] bg-accent/15 blur-md"
        style={{ transform: "scale(0.9)" }}
      />

      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        className="relative text-accent"
      >
        {/* Outer diamond — the consensus node. Rounded corners for a
            modern, precise feel; sharp ones look brittle at small sizes. */}
        <path
          d="M16 3 L29 16 L16 29 L3 16 Z"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinejoin="round"
        />
        {/* Inner verdict — a confident checkmark, weight-matched to the
            outer stroke so the two shapes belong to the same family. */}
        <path
          d="M10.5 16.5 L14.5 20.5 L21.5 12.5"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
