"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useSpeak } from "@/lib/tts";

export type HistoryItem = {
  id: string;
  sentence: string;
  mode: string;
  contextTag: string | null;
  source: string;
  createdAt: string; // ISO
  candidates: { text: string; confidence: number }[];
};

const CATEGORY_KEYS = new Set([
  "hospital",
  "grocery",
  "restaurant",
  "transport",
  "school",
  "other",
]);

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const t = useTranslations("app");
  const th = useTranslations("app.history");
  const locale = useLocale() as "th" | "en";
  const { say } = useSpeak(locale);

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.sentence.toLowerCase().includes(q));
  }, [items, query]);

  function tagLabel(tag: string | null): string | null {
    if (!tag) return null;
    if (tag === "emergency") return t("context.emergencyTitle");
    if (CATEGORY_KEYS.has(tag)) return t(`everyday.categories.${tag}`);
    return tag;
  }

  function fmt(iso: string): string {
    return new Date(iso).toLocaleString(locale === "th" ? "th-TH" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-extrabold">{th("title")}</h1>

      <div className="relative">
        <Icons.history
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={th("searchPlaceholder")}
          className="pl-9"
          aria-label={th("searchPlaceholder")}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{th("empty")}</Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const open = expanded === item.id;
            const tag = tagLabel(item.contextTag);
            return (
              <li key={item.id}>
                <Card className="overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : item.id)}
                      aria-expanded={open}
                      className="flex-1 text-left"
                    >
                      <p className="text-xs text-muted-foreground">
                        {fmt(item.createdAt)}
                      </p>
                      <p className="mt-0.5 font-semibold">{item.sentence}</p>
                      {tag && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                          {item.mode === "emergency" ? (
                            <Icons.emergency className="size-3" aria-hidden />
                          ) : (
                            <Icons.featureCamera className="size-3" aria-hidden />
                          )}
                          {tag}
                        </span>
                      )}
                    </button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => say(item.sentence)}
                      aria-label={th("play")}
                    >
                      <Icons.playAudio className="size-5" aria-hidden />
                    </Button>
                  </div>

                  {open && (
                    <div className="border-t bg-secondary/30 p-4 text-sm">
                      <p className="text-muted-foreground">
                        {th(`source.${item.source === "preset" ? "preset" : "camera"}`)}
                      </p>
                      {item.candidates.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {item.candidates.map((c, i) => (
                            <li key={i} className="flex justify-between gap-3">
                              <span>{c.text}</span>
                              <span className="text-muted-foreground">
                                {Math.round(c.confidence * 100)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
