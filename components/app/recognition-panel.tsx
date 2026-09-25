"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { EditableSentence } from "./editable-sentence";
import { FaceAnalyticsBar } from "./face-analytics-bar";
import { cn } from "@/lib/utils";
import type { FaceSignals } from "@/lib/holistic/keypoints";
import type { Suggestion } from "@/lib/sentence/compose";
import type { Candidate } from "@/lib/translation";

/** 3-step smiley scale — more legible at a glance than a raw percentage,
 * and reuses the same 0..1 confidence the model already produces. */
function ConfidenceSmiley({ confidence }: { confidence: number }) {
  const Icon =
    confidence >= 0.75 ? Icons.confidenceHigh : confidence >= 0.5 ? Icons.confidenceMid : Icons.confidenceLow;
  return <Icon className="size-6 shrink-0 text-primary" aria-hidden />;
}

/**
 * Shared recognition UI: recognized-word card (with smiley confidence),
 * composed-sentence suggestions, an edit-icon-toggled sentence card, face
 * analytics, and the Play/Save/Clear/Stop action row. Used by both the
 * standalone camera-translate flow and (visually mirrored in) the family-call
 * signer view.
 */
export function RecognitionPanel({
  liveTop,
  liveSecond,
  onPlayAlternative,
  suggestions,
  selectedIdx,
  onSelectSuggestion,
  words,
  onWordsChange,
  vocab,
  face,
  onPlay,
  onSave,
  onClear,
  onStop,
  saved,
  canSave,
  canPlay,
}: {
  liveTop: Candidate | null;
  liveSecond: Candidate | null;
  onPlayAlternative: (text: string) => void;
  suggestions: Suggestion[];
  selectedIdx: number;
  onSelectSuggestion: (i: number) => void;
  words: string[];
  onWordsChange: (next: string[]) => void;
  vocab: string[];
  face: FaceSignals;
  onPlay: () => void;
  onSave: () => void;
  onClear: () => void;
  onStop: () => void;
  saved: boolean;
  canSave: boolean;
  canPlay: boolean;
}) {
  const t = useTranslations("app.camera");
  const [editingSentence, setEditingSentence] = useState(false);
  const chosenText = suggestions[selectedIdx]?.text ?? suggestions[0]?.text ?? "";

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
        <p className="text-xs font-medium text-muted-foreground">{t("recognized")}</p>
        {liveTop ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 break-words text-2xl font-extrabold sm:text-3xl">{liveTop.text}</span>
              <ConfidenceSmiley confidence={liveTop.confidence} />
            </div>
            {liveSecond && (
              <button
                type="button"
                onClick={() => onPlayAlternative(liveSecond.text)}
                className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="text-muted-foreground">
                  {t("alternative")}:{" "}
                  <span className="font-semibold text-foreground">{liveSecond.text}</span>
                </span>
                <Icons.playAudio className="size-4 text-muted-foreground" aria-hidden />
              </button>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{t("raiseHand")}</p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("suggested")}</p>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => {
              const active = i === selectedIdx;
              return (
                <button
                  key={`${s.text}-${i}`}
                  type="button"
                  onClick={() => onSelectSuggestion(i)}
                  aria-pressed={active}
                  className={cn(
                    "w-full rounded-lg border-2 p-3 text-left text-base font-semibold transition-colors sm:text-lg",
                    active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  {s.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sentence card: read-only display with an edit-icon toggle into the
          word-chip editor, per the mockup's pencil-icon interaction. */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{t("words")}</p>
          <button
            type="button"
            onClick={() => setEditingSentence((v) => !v)}
            aria-pressed={editingSentence}
            aria-label={t("editWord")}
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Icons.edit className="size-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-12 rounded-lg bg-secondary/60 p-3">
          {editingSentence ? (
            <EditableSentence words={words} onChange={onWordsChange} suggestions={vocab} />
          ) : (
            <p className="text-lg font-semibold">{chosenText || words.join(" ") || "—"}</p>
          )}
        </div>
      </div>

      <FaceAnalyticsBar signals={face} />

      <div className="mt-auto grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={onPlay} disabled={!canPlay}>
          <Icons.playAudio className="size-5" aria-hidden />
          {t("play")}
        </Button>
        <Button onClick={onSave} disabled={!canSave}>
          <Icons.confirm className="size-5" aria-hidden />
          {t("save")}
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={words.length === 0}>
          {t("clear")}
        </Button>
        <Button variant="ghost" onClick={onStop}>
          <Icons.close className="size-5" aria-hidden />
          {t("stop")}
        </Button>
      </div>

      {saved && (
        <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          <Icons.confirm className="size-4" aria-hidden />
          {t("saved")}
        </p>
      )}
    </Card>
  );
}
