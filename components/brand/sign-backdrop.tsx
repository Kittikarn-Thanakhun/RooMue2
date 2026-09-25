import * as React from "react";
import { Hand, HandMetal, Grab } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Decorative, non-interactive backdrop for the landing and auth pages.
 *
 * A sparse, delicate line-art pattern of sign-language hand gestures clustered
 * near the top of the page (the hero), drifting slowly. The background itself
 * is left neutral/white so it never tints the sponsor logos below. Hands are
 * thin-stroked at low opacity and masked so they melt away before reaching the
 * content lower down. Purely cosmetic: aria-hidden + pointer-events-none.
 */

type Placed = {
  Icon: LucideIcon;
  left: string;
  top: string; // relative to the top decorative band
  size: number;
  rotate: number;
  opacity: number;
  duration: number; // seconds — slow, gradual drift
  delay: number;
};

// Mix of gestures, weighted toward the top, hand-tuned for an organic scatter.
const TOP_HANDS: Placed[] = [
  { Icon: Hand, left: "7%", top: "14%", size: 150, rotate: -14, opacity: 0.16, duration: 17, delay: 0 },
  { Icon: HandMetal, left: "23%", top: "6%", size: 96, rotate: 10, opacity: 0.12, duration: 21, delay: 2.5 },
  { Icon: Grab, left: "39%", top: "26%", size: 84, rotate: -6, opacity: 0.1, duration: 24, delay: 1 },
  { Icon: Hand, left: "57%", top: "9%", size: 122, rotate: 14, opacity: 0.14, duration: 19, delay: 3.5 },
  { Icon: HandMetal, left: "73%", top: "24%", size: 100, rotate: -20, opacity: 0.12, duration: 22, delay: 1.5 },
  { Icon: Hand, left: "91%", top: "13%", size: 150, rotate: 8, opacity: 0.15, duration: 18, delay: 0.8 },
  { Icon: Grab, left: "15%", top: "42%", size: 80, rotate: 22, opacity: 0.1, duration: 23, delay: 2 },
  { Icon: HandMetal, left: "85%", top: "44%", size: 92, rotate: 12, opacity: 0.1, duration: 20, delay: 4 },
];

// Scattered across the whole screen for "spread=full" — smaller, denser, and
// paired with the bouncier .sign-hand-bounce animation (shorter durations).
// Opacity is much higher than TOP_HANDS: this variant is meant to actually
// read as hand shapes at a glance, not sit as a barely-there wash.
const FULL_HANDS: Placed[] = [
  { Icon: Hand, left: "8%", top: "8%", size: 110, rotate: -14, opacity: 0.38, duration: 4.4, delay: 0 },
  { Icon: HandMetal, left: "26%", top: "4%", size: 72, rotate: 10, opacity: 0.3, duration: 5.1, delay: 0.7 },
  { Icon: Grab, left: "42%", top: "16%", size: 64, rotate: -6, opacity: 0.28, duration: 4.7, delay: 1.4 },
  { Icon: Hand, left: "60%", top: "6%", size: 92, rotate: 14, opacity: 0.34, duration: 5.4, delay: 2.1 },
  { Icon: HandMetal, left: "80%", top: "14%", size: 78, rotate: -20, opacity: 0.3, duration: 4.9, delay: 0.4 },
  { Icon: Hand, left: "93%", top: "6%", size: 100, rotate: 8, opacity: 0.36, duration: 5.6, delay: 1.8 },
  { Icon: Grab, left: "4%", top: "34%", size: 60, rotate: 22, opacity: 0.26, duration: 4.6, delay: 1.1 },
  { Icon: HandMetal, left: "94%", top: "38%", size: 70, rotate: 12, opacity: 0.28, duration: 5.2, delay: 2.6 },
  { Icon: Hand, left: "12%", top: "56%", size: 66, rotate: -10, opacity: 0.28, duration: 5.0, delay: 0.2 },
  { Icon: Grab, left: "88%", top: "60%", size: 58, rotate: 18, opacity: 0.26, duration: 4.5, delay: 1.6 },
  { Icon: HandMetal, left: "6%", top: "76%", size: 64, rotate: -16, opacity: 0.26, duration: 5.3, delay: 0.9 },
  { Icon: Hand, left: "90%", top: "80%", size: 76, rotate: 6, opacity: 0.3, duration: 4.8, delay: 2.3 },
  { Icon: Grab, left: "48%", top: "90%", size: 56, rotate: -8, opacity: 0.24, duration: 5.5, delay: 1.3 },
];

export function SignBackdrop({
  className,
  tone = "primary",
  spread = "top",
  motion = "drift",
}: {
  className?: string;
  /** "primary" for light backgrounds, "white" for the deep-blue gradient screens. */
  tone?: "primary" | "white";
  /** "top": clustered/masked near the top (hero band). "full": scattered
   * across the whole container, filling the page instead of leaving it bare. */
  spread?: "top" | "full";
  /** "drift": slow float. "bounce": livelier springy bounce. */
  motion?: "drift" | "bounce";
}) {
  const hands = spread === "full" ? FULL_HANDS : TOP_HANDS;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      {/* "top": clustered near the top, masked to fade before the content
          below. "full": no mask, spread across the whole area. No color wash
          so content/logos stay unaffected. */}
      <div
        className={cn(
          "absolute inset-0",
          spread === "top" &&
            "inset-x-0 top-0 h-[85vh] [mask-image:radial-gradient(125%_100%_at_50%_16%,black,transparent_72%)]",
          tone === "white" ? "text-white" : "text-primary"
        )}
      >
        {hands.map(({ Icon, left, top, size, rotate, opacity, duration, delay }, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left, top }}
          >
            <Icon
              className={motion === "bounce" ? "sign-hand-bounce block" : "sign-hand block"}
              style={{
                width: size,
                height: size,
                opacity,
                rotate: `${rotate}deg`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
              strokeWidth={spread === "full" ? 1.6 : 1.1}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
