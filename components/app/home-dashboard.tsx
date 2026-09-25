"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Icons, type LucideIcon } from "@/components/icons";
import { DashboardBackdrop } from "@/components/brand/dashboard-backdrop";
import type { HistoryItem } from "./history-list";

export type CategoryKey =
  | "hospital"
  | "grocery"
  | "restaurant"
  | "transport"
  | "school"
  | "police"
  | "home"
  | "other";

const CATEGORIES: { key: CategoryKey; Icon: LucideIcon }[] = [
  { key: "school", Icon: Icons.school },
  { key: "restaurant", Icon: Icons.restaurant },
  { key: "transport", Icon: Icons.transport },
  { key: "police", Icon: Icons.police },
  { key: "hospital", Icon: Icons.hospital },
  { key: "grocery", Icon: Icons.grocery },
  { key: "home", Icon: Icons.home },
  { key: "other", Icon: Icons.other },
];

/** The `/app` landing screen: search, a short history preview, and the
 * category grid — tapping a category launches camera translation for it. */
export function HomeDashboard({
  historyPreview,
  onSelectCategory,
}: {
  historyPreview: HistoryItem[];
  onSelectCategory: (key: CategoryKey) => void;
}) {
  const t = useTranslations("app.dashboard");
  const tCat = useTranslations("app.everyday.categories");
  const locale = useLocale() as "th" | "en";

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
      dateStyle: "medium",
    });
  }

  return (
    <div className="relative isolate mx-auto min-h-[calc(100dvh-14rem)] max-w-2xl space-y-6 py-2">
      <DashboardBackdrop />

      <Link
        href="/app/call"
        className="flex h-12 items-center gap-2 rounded-full border bg-card px-4 text-sm text-muted-foreground transition-colors hover:border-primary/40"
      >
        <Icons.search className="size-4 shrink-0" aria-hidden />
        {t("searchPlaceholder")}
      </Link>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">{t("historyTitle")}</h2>
          <Link
            href="/app/history"
            aria-label={t("seeAll")}
            className="grid size-8 place-items-center rounded-full text-primary hover:bg-primary/10"
          >
            <Icons.next className="size-5" aria-hidden />
          </Link>
        </div>
        {historyPreview.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            {t("historyEmpty")}
          </Card>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {historyPreview.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                  {fmtDate(item.createdAt)}
                </span>
                <span className="truncate font-medium">{item.sentence}</span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold text-primary">{t("categoriesTitle")}</h2>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {CATEGORIES.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelectCategory(key)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center transition-colors hover:border-primary/40"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-xs font-medium leading-tight">{tCat(key)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
