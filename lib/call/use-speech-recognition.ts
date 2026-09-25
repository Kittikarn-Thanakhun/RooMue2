"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Web Speech API speech-to-text (Chrome/Edge). Continuous with interim
 * results; auto-restarts on end. Calls onResult(text, isFinal).
 */
export function useSpeechRecognition({
  enabled,
  lang,
  onResult,
}: {
  enabled: boolean;
  lang: string;
  onResult: (text: string, isFinal: boolean) => void;
}) {
  const [supported, setSupported] = useState(true);
  const onRef = useRef(onResult);
  useEffect(() => {
    onRef.current = onResult;
  });

  useEffect(() => {
    if (!enabled) return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    let running = true;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0].transcript;
        if (r.isFinal) onRef.current(txt.trim(), true);
        else interim += txt;
      }
      if (interim.trim()) onRef.current(interim.trim(), false);
    };
    rec.onend = () => {
      if (running) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };
    try {
      rec.start();
    } catch {
      /* noop */
    }

    return () => {
      running = false;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
  }, [enabled, lang]);

  return { supported };
}
