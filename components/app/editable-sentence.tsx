"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons";

/**
 * Editable sentence built from recognized words. Each word is a chip you can
 * tap to correct (free text, with the known vocabulary offered as suggestions)
 * or remove. Empty edit removes the word.
 */
export function EditableSentence({
  words,
  onChange,
  suggestions = [],
}: {
  words: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
}) {
  const t = useTranslations("app.camera");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(i: number) {
    setEditing(i);
    setDraft(words[i]);
  }

  function commit(i: number) {
    const v = draft.trim();
    const next = [...words];
    if (!v) next.splice(i, 1);
    else next[i] = v;
    onChange(next);
    setEditing(null);
  }

  function remove(i: number) {
    const next = [...words];
    next.splice(i, 1);
    onChange(next);
    setEditing(null);
  }

  if (words.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {words.map((w, i) =>
          editing === i ? (
            <span
              key={i}
              className="inline-flex items-center rounded-lg border-2 border-primary bg-background px-2 py-1"
            >
              <input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                list="thsl-vocab"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit(i);
                  if (e.key === "Escape") setEditing(null);
                }}
                aria-label={t("editWord")}
                className="w-28 bg-transparent text-lg font-semibold outline-none"
              />
            </span>
          ) : (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-lg bg-background px-2 py-1 shadow-sm ring-1 ring-border"
            >
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="rounded text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${t("editWord")}: ${w}`}
              >
                {w}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`${t("removeWord")}: ${w}`}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Icons.close className="size-4" aria-hidden />
              </button>
            </span>
          )
        )}
      </div>

      <datalist id="thsl-vocab">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Icons.edit className="size-3" aria-hidden />
        {t("editHint")}
      </p>
    </div>
  );
}
