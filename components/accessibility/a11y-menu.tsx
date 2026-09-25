"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icons, type LucideIcon } from "@/components/icons";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";
import { type A11yPrefs, useA11y } from "./a11y-provider";

const ITEMS: { key: keyof A11yPrefs; Icon: LucideIcon }[] = [
  { key: "voiceGuidance", Icon: Icons.playAudio },
  { key: "voiceCommands", Icon: Icons.micTts },
  { key: "largeText", Icon: Icons.textSize },
  { key: "highContrast", Icon: Icons.contrast },
];

/**
 * Header control that opens the accessibility settings panel. Each option is a
 * proper switch (role="switch" + aria-checked) and toggling it confirms the new
 * state out loud so blind users get immediate feedback.
 */
export function A11yMenu({ className }: { className?: string }) {
  const t = useTranslations("a11y");
  const locale = useLocale() as "th" | "en";
  const a11y = useA11y();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleToggle(key: keyof A11yPrefs, label: string) {
    const next = !a11y[key];
    a11y.toggle(key);
    // Confirm by voice. Speak directly (not via announce) so turning voice
    // guidance ON is confirmed even though context state hasn't updated yet.
    speak(`${label} ${next ? t("on") : t("off")}`, locale);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("openLabel")}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex min-h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Icons.accessibility className="size-4" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border bg-card p-2 shadow-lg"
        >
          <p className="px-2 py-1.5 text-sm font-bold">{t("title")}</p>
          <ul>
            {ITEMS.map(({ key, Icon }) => {
              const on = a11y[key];
              const label = t(key);
              return (
                <li key={key}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => handleToggle(key, label)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          "size-5",
                          on ? "text-primary" : "text-muted-foreground"
                        )}
                        aria-hidden
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
                        on ? "bg-primary" : "bg-input"
                      )}
                    >
                      <span
                        className={cn(
                          "size-4 rounded-full bg-background shadow transition-transform",
                          on ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {a11y.voiceCommands && (
            <p className="px-2 pb-1 pt-1.5 text-xs text-muted-foreground">
              {t("voiceCommandsHint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
