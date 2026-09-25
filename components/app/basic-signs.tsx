"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useSpeak } from "@/lib/tts";
import { BASIC_SIGNS } from "@/lib/data/basic-signs";

/**
 * The 20 basic daily-life Thai Sign Language gestures from the source guide.
 * Each row reads the word aloud (TTS) and expands to show meaning + how-to.
 */
export function BasicSigns() {
  const t = useTranslations("app.basicSigns");
  const locale = useLocale() as "th" | "en";
  const { say } = useSpeak(locale);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {BASIC_SIGNS.map((sign, i) => {
        const expanded = open === i;
        return (
          <Card key={sign.th} className="overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                className="flex-1 text-left"
              >
                <span className="text-xl font-extrabold">{sign.th}</span>
                <span className="ml-2 text-sm text-muted-foreground">{sign.en}</span>
              </button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => say(sign.th)}
                aria-label={`${t("play")}: ${sign.th}`}
              >
                <Icons.playAudio className="size-5" aria-hidden />
              </Button>
            </div>

            {expanded && (
              <div className="space-y-3 border-t bg-secondary/30 p-4 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground">{t("meaning")}</p>
                  <p className="mt-0.5">{sign.meaning}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">{t("howto")}</p>
                  <p className="mt-0.5 leading-relaxed">{sign.howto}</p>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
