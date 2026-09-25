import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Roo_mue brand assets.
 *
 * `BrandMark` is the app icon — the official Roo_mue logo image, rendered as a
 * rounded squircle. `Logo` pairs it with the wordmark. Sizing is driven
 * entirely by the `size-*` class passed in, so the mark stays crisp from a
 * 32px header chip up to the hero.
 */

const markSizes = {
  sm: "size-9",
  md: "size-11",
  lg: "size-14",
} as const;

const wordSizes = {
  sm: "text-base",
  md: "text-lg sm:text-xl",
  lg: "text-2xl sm:text-3xl",
} as const;

type Size = keyof typeof markSizes;

export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/roomue-logo.png"
      alt=""
      aria-hidden
      className={cn(
        "shrink-0 rounded-[24%] object-cover shadow-md",
        className
      )}
    />
  );
}

export function Logo({
  size = "md",
  showWordmark = true,
  showThai = true,
  gradient = false,
  light = false,
  name = "Roo_mue",
  className,
}: {
  size?: Size;
  showWordmark?: boolean;
  showThai?: boolean;
  gradient?: boolean;
  /** White wordmark, for use on the deep-blue gradient screens. */
  light?: boolean;
  name?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandMark className={markSizes[size]} />
      {showWordmark && (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "truncate font-extrabold tracking-tight",
              wordSizes[size],
              gradient
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent"
                : light
                  ? "text-white"
                  : "text-foreground"
            )}
          >
            {name}
          </span>
          {showThai && (
            <span
              className={cn(
                "mt-1 truncate text-[0.7em] font-medium",
                light ? "text-white/70" : "text-muted-foreground"
              )}
            >
              รู้มือ · Thai Sign Language
            </span>
          )}
        </span>
      )}
    </span>
  );
}
