"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icons, type LucideIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  key: "home" | "history" | "signs" | "call" | "profile";
  Icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/app", key: "home", Icon: Icons.home },
  { href: "/app/history", key: "history", Icon: Icons.history },
  { href: "/app/signs", key: "signs", Icon: Icons.hand },
  { href: "/app/call", key: "call", Icon: Icons.call },
  { href: "/app/profile", key: "profile", Icon: Icons.profile },
];

/** Floating rounded bottom navigation bar. */
export function AppNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      className="bg-brand-gradient fixed inset-x-4 bottom-4 z-30 mx-auto max-w-sm rounded-full p-1.5 shadow-lg sm:inset-x-0"
      aria-label="Primary"
    >
      <div className="flex items-center justify-around">
        {TABS.map(({ href, key, Icon }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={t(key)}
              className={cn(
                "grid size-11 place-items-center rounded-full transition-colors sm:size-12",
                active ? "bg-white text-primary" : "text-white/75 hover:text-white"
              )}
            >
              <Icon className="size-5" aria-hidden />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
