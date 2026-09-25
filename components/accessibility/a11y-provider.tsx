"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { isTtsSupported, speak } from "@/lib/tts";
import { useSpeechRecognition } from "@/lib/call/use-speech-recognition";

/**
 * Accessibility preferences for blind / low-vision users:
 *  - voiceGuidance: app narrates the focused control and each new screen aloud.
 *  - voiceCommands: navigate hands-free by speaking ("home", "หน้าหลัก", ...).
 *  - largeText / highContrast: visual aids for low vision (applied via classes
 *    on <html> — see globals.css).
 *
 * All preferences persist to localStorage so they survive reloads. A polite
 * aria-live region is always rendered so assistive tech (VoiceOver/NVDA/...)
 * hears announcements even when voiceGuidance (our own TTS) is off.
 */
export type A11yPrefs = {
  voiceGuidance: boolean;
  voiceCommands: boolean;
  largeText: boolean;
  highContrast: boolean;
};

const DEFAULTS: A11yPrefs = {
  voiceGuidance: false,
  voiceCommands: false,
  largeText: false,
  highContrast: false,
};

const STORAGE_KEY = "roo_mue:a11y";

type A11yContextValue = A11yPrefs & {
  toggle: (key: keyof A11yPrefs) => void;
  /** Push text to the live region and, when voice guidance is on, speak it. */
  announce: (text: string) => void;
};

const A11yContext = createContext<A11yContextValue | null>(null);

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useA11y must be used within <A11yProvider>");
  return ctx;
}

/** Voice-command keywords per action, matched case-insensitively (th + en). */
const COMMANDS: { test: string[]; run: (nav: (href: string) => void) => void }[] =
  [
    { test: ["หน้าหลัก", "หน้าแรก", "home"], run: (n) => n("/app") },
    { test: ["โทร", "call"], run: (n) => n("/app/call") },
    { test: ["ประวัติ", "history"], run: (n) => n("/app/history") },
    { test: ["โปรไฟล์", "profile"], run: (n) => n("/app/profile") },
  ];

/** Returns the accessible name a screen reader would announce for an element. */
function accessibleName(el: HTMLElement | null): string {
  if (!el) return "";
  const label =
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    (el as HTMLInputElement).placeholder ||
    el.textContent ||
    "";
  return label.replace(/\s+/g, " ").trim().slice(0, 140);
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale() as "th" | "en";
  const pathname = usePathname();
  const router = useRouter();

  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS);
  const [liveText, setLiveText] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Load saved preferences once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);

  // Persist on change (after hydration so we never overwrite with defaults).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* storage may be unavailable */
    }
  }, [prefs, hydrated]);

  // Apply visual modes as classes on <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("a11y-large-text", prefs.largeText);
    root.classList.toggle("a11y-high-contrast", prefs.highContrast);
  }, [prefs.largeText, prefs.highContrast]);

  const announce = useCallback(
    (text: string) => {
      if (!text) return;
      // Re-set even if identical so the live region re-fires.
      setLiveText("");
      requestAnimationFrame(() => setLiveText(text));
      if (prefs.voiceGuidance && isTtsSupported()) speak(text, locale);
    },
    [prefs.voiceGuidance, locale]
  );

  // Voice guidance: speak the focused control as the user tabs/swipes through.
  useEffect(() => {
    if (!prefs.voiceGuidance) return;
    let last = "";
    const onFocus = (e: FocusEvent) => {
      const name = accessibleName(e.target as HTMLElement);
      if (name && name !== last) {
        last = name;
        speak(name, locale);
      }
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [prefs.voiceGuidance, locale]);

  // Announce each new screen by its main heading. The live region fires for
  // every user (so screen readers announce SPA navigations, which they often
  // miss); our own TTS narration is layered on only when voice guidance is on.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const heading = document.querySelector("main h1, main h2");
      const title = heading?.textContent?.trim() || document.title;
      if (!title) return;
      setLiveText("");
      requestAnimationFrame(() => setLiveText(title));
      if (prefs.voiceGuidance && isTtsSupported()) speak(title, locale);
    }, 350);
    return () => window.clearTimeout(id);
  }, [pathname, prefs.voiceGuidance, locale]);

  // Voice commands: map spoken phrases to navigation / playback control.
  const handleCommand = useCallback(
    (raw: string) => {
      const text = raw.toLowerCase();
      // Stop speaking.
      if (text.includes("หยุด") || text.includes("stop")) {
        window.speechSynthesis?.cancel();
        return;
      }
      // Repeat the current screen heading.
      if (text.includes("อ่าน") || text.includes("ซ้ำ") || text.includes("repeat")) {
        const heading = document.querySelector("main h1, main h2");
        const title = heading?.textContent?.trim() || document.title;
        if (title) speak(title, locale);
        return;
      }
      for (const cmd of COMMANDS) {
        if (cmd.test.some((kw) => text.includes(kw))) {
          cmd.run((href) => router.push(href));
          return;
        }
      }
    },
    [locale, router]
  );

  useSpeechRecognition({
    enabled: prefs.voiceCommands,
    lang: locale === "th" ? "th-TH" : "en-US",
    onResult: (text, isFinal) => {
      if (isFinal) handleCommand(text);
    },
  });

  const toggle = useCallback((key: keyof A11yPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  return (
    <A11yContext.Provider value={{ ...prefs, toggle, announce }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveText}
      </div>
    </A11yContext.Provider>
  );
}
