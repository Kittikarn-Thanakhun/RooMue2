"use client";

import { useEffect, useState, useCallback } from "react";

export function isTtsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Plays a pre-rendered audio clip (e.g. an emergency phrase voiced by a neural
 * TTS at build time). Resolves when playback finishes; rejects if the file is
 * missing or playback fails — callers can then fall back to live TTS.
 */
export function playClip(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    const audio = new Audio(src);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error(`failed to play ${src}`));
    audio.play().catch(reject);
  });
}

// Voices load asynchronously in most browsers — getVoices() is often empty on
// the very first call. Cache the load so we resolve instantly once warmed.
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isTtsSupported()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length) return Promise.resolve(existing);
  if (voicesPromise) return voicesPromise;

  voicesPromise = new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener?.("voiceschanged", done, { once: true });
    // Fallback: some browsers never fire the event after a cold start.
    setTimeout(done, 1000);
  });
  return voicesPromise;
}

/**
 * Picks the best voice for the locale, prioritising LATENCY over polish.
 *
 * Cloud/online voices (e.g. "Microsoft Premwadee Online (Natural)") sound more
 * human but stream audio over the network, adding a 1-3s delay on every tap —
 * unacceptable for emergency phrases that must speak instantly. So we rank
 * offline (localService) voices first, then pick the highest-quality one
 * among them.
 */
function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  locale: "th" | "en"
): SpeechSynthesisVoice | undefined {
  const matches = voices.filter(
    (v) =>
      v.lang === lang ||
      v.lang.replace("_", "-").toLowerCase().startsWith(locale)
  );
  if (!matches.length) return undefined;

  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    // Latency first: offline voices play immediately.
    if (v.localService) s += 10;
    // Among equally-fast voices, prefer higher-quality engines.
    if (/neural|natural|enhanced|premium/i.test(v.name)) s += 4;
    if (/google/i.test(v.name)) s += 2;
    if (/microsoft/i.test(v.name)) s += 2;
    if (v.lang === lang) s += 1; // exact region match
    return s;
  };

  return [...matches].sort((a, b) => score(b) - score(a))[0];
}

/**
 * Web Speech API text-to-speech. Picks the best available Thai/English voice
 * and tunes the delivery for natural-sounding speech. Safe no-op when the API
 * is unavailable. Stays inside the user gesture when voices are already warmed.
 */
export function speak(text: string, locale: "th" | "en" = "th") {
  if (!isTtsSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  const lang = locale === "th" ? "th-TH" : "en-US";

  const run = (voices: SpeechSynthesisVoice[]) => {
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const voice = pickVoice(voices, lang, locale);
    if (voice) utter.voice = voice;
    // Slightly slower than default with neutral pitch reads as calmer and
    // clearer — important for emergency phrases.
    utter.rate = 0.98;
    utter.pitch = 1;
    utter.volume = 1;
    synth.speak(utter);
  };

  const cached = synth.getVoices();
  if (cached.length) run(cached);
  else void loadVoices().then(run);
}

/** Hook exposing a stable speak() bound to the current locale. */
export function useSpeak(locale: "th" | "en") {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isTtsSupported()) return;
    let alive = true;
    // Warm the voice cache so the first tap speaks immediately.
    void loadVoices().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const say = useCallback((text: string) => speak(text, locale), [locale]);
  return { say, ready, supported: isTtsSupported() };
}
