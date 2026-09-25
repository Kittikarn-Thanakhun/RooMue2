import * as React from "react";
import { Hand, HandMetal, Grab } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Decorative, non-interactive backdrop for the `/app` dashboard — bouncing
 * sign-language hand icons scattered across the full card, filling out the
 * page instead of leaving it mostly blank white space. Purely cosmetic:
 * aria-hidden + pointer-events-none, low-opacity so it never competes with
 * the search/history/category content in front of it.
 */

type Placed = {
  Icon: LucideIcon;
  left: string;
  top: string;
  size: number;
  rotate: number;
  opacity: number;
  duration: number;
  delay: number;
};

const HANDS: Placed[] = [
  { Icon: Hand, left: "4%", top: "4%", size: 70, rotate: -12, opacity: 0.1, duration: 4.5, delay: 0 },
  { Icon: HandMetal, left: "88%", top: "2%", size: 56, rotate: 16, opacity: 0.08, duration: 5.2, delay: 0.6 },
  { Icon: Grab, left: "92%", top: "22%", size: 48, rotate: -8, opacity: 0.09, duration: 4.8, delay: 1.4 },
  { Icon: Hand, left: "2%", top: "34%", size: 58, rotate: 10, opacity: 0.08, duration: 5.6, delay: 0.3 },
  { Icon: HandMetal, left: "90%", top: "46%", size: 66, rotate: -18, opacity: 0.1, duration: 4.2, delay: 1.8 },
  { Icon: Grab, left: "5%", top: "58%", size: 50, rotate: 20, opacity: 0.08, duration: 5.0, delay: 0.9 },
  { Icon: Hand, left: "86%", top: "68%", size: 60, rotate: -6, opacity: 0.09, duration: 4.6, delay: 2.2 },
  { Icon: HandMetal, left: "6%", top: "80%", size: 52, rotate: 14, opacity: 0.08, duration: 5.4, delay: 1.1 },
  { Icon: Grab, left: "92%", top: "88%", size: 46, rotate: -14, opacity: 0.08, duration: 4.9, delay: 0.5 },
  { Icon: Hand, left: "50%", top: "94%", size: 54, rotate: 8, opacity: 0.07, duration: 5.8, delay: 1.6 },
];

export function DashboardBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      {HANDS.map(({ Icon, left, top, size, rotate, opacity, duration, delay }, i) => (
        <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left, top }}>
          <Icon
            className="sign-hand-bounce block text-primary"
            style={{
              width: size,
              height: size,
              opacity,
              rotate: `${rotate}deg`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
            strokeWidth={1.2}
          />
        </span>
      ))}
    </div>
  );
}
