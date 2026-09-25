"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type PillTabOption = { key: string; label: string; href?: string };

/**
 * Two-ish-segment white pill switcher (e.g. "สมัครสมาชิก / เข้าสู่ระบบ" on the
 * auth screens, or a role-select toggle). Renders as `<a>`s when `href` is set
 * (route-switching tabs) or as buttons when `onSelect` is used (in-page toggle).
 */
export function PillTabs({
  options,
  activeKey,
  onSelect,
  className,
}: {
  options: PillTabOption[];
  activeKey: string;
  onSelect?: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.key === activeKey;
        const shared = cn(
          "flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-colors",
          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        );
        if (opt.href) {
          return (
            <Link key={opt.key} href={opt.href} role="tab" aria-selected={active} className={shared}>
              {opt.label}
            </Link>
          );
        }
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect?.(opt.key)}
            className={shared}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
