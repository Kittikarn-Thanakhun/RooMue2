"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/locale";
import { locales, type Locale } from "@/i18n/config";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Global language toggle. Persists choice to the NEXT_LOCALE cookie via a
 * server action, then refreshes server components so the new locale applies
 * site-wide immediately.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations("common");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === active) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const label: Record<Locale, string> = {
    th: t("switchToThai"),
    en: t("switchToEnglish"),
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-card p-1",
        className
      )}
      role="group"
      aria-label={t("languageToggleLabel")}
    >
      <Icons.language className="ml-1 size-4 text-muted-foreground sm:ml-2" aria-hidden />
      {locales.map((loc) => {
        const isActive = loc === active;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => choose(loc)}
            disabled={isPending}
            aria-pressed={isActive}
            className={cn(
              "min-h-9 rounded-full px-2.5 text-sm font-semibold transition-colors disabled:opacity-60 sm:px-3",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="sm:hidden">{loc.toUpperCase()}</span>
            <span className="hidden sm:inline">{label[loc]}</span>
          </button>
        );
      })}
    </div>
  );
}
