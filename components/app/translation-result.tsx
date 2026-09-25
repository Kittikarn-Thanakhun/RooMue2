"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { useSpeak } from "@/lib/tts";
import { saveSession } from "@/app/app/actions";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/lib/translation";

export function TranslationResult({
  candidates,
  mode,
  contextTag,
  onTranslateAgain,
}: {
  candidates: [Candidate, Candidate];
  mode: "emergency" | "everyday";
  contextTag: string | null;
  onTranslateAgain: () => void;
}) {
  const t = useTranslations("app.result");
  const locale = useLocale() as "th" | "en";
  const { say } = useSpeak(locale);

  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(candidates[0].text);
  const [saved, setSaved] = useState(false);

  function choose(i: number) {
    setSelected(i);
    setText(candidates[i].text);
    setSaved(false);
  }

  async function confirm() {
    // Speak first — this is the primary action and must never be blocked by a
    // failed history save.
    say(text);
    try {
      const res = await saveSession({
        mode,
        contextTag,
        sentence: text,
        candidates,
        source: "camera",
      });
      setSaved(res.ok);
    } catch {
      // Saving history is best-effort; ignore failures so the UI stays usable.
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold">{t("title")}</h3>

      <div className="space-y-2">
        {candidates.map((c, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-start justify-between gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <span className="text-lg font-semibold">{c.text}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("confidence")} {Math.round(c.confidence * 100)}%
              </span>
            </button>
          );
        })}
      </div>

      {editing ? (
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("editPlaceholder")}
          aria-label={t("edit")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Icons.edit className="size-4" aria-hidden />
          {t("edit")}
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={confirm} className="flex-1">
          <Icons.confirm className="size-5" aria-hidden />
          {t("confirm")}
        </Button>
        <Button variant="outline" onClick={() => say(text)} aria-label={t("play")}>
          <Icons.playAudio className="size-5" aria-hidden />
          {t("play")}
        </Button>
      </div>

      {saved && (
        <p
          role="status"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <Icons.confirm className="size-4" aria-hidden />
          {t("saved")}
        </p>
      )}

      <Button variant="ghost" className="w-full" onClick={onTranslateAgain}>
        <Icons.camera className="size-5" aria-hidden />
        {t("translateAgain")}
      </Button>
    </div>
  );
}
