"use client";

import { useEffect, useRef, useState } from "react";
import { classifyFrame, AlphabetModelLoading } from "@/lib/translation/alphabet-client";
import type { Candidate } from "@/lib/translation";

export type AlphabetStatus = "idle" | "loading" | "ready" | "error";

// Letters are committed once seen this many times in a row, above threshold.
const CONSISTENCY = 3;
const THRESHOLD = 0.5;
// One remote call at a time; this is the gap between finishing one and starting
// the next. Keeps load on the HF API (and the rate limit) reasonable.
const POLL_INTERVAL_MS = 650;

/**
 * Drives the ASL alphabet (A–Z) mode: repeatedly snapshots the playing video,
 * sends each frame to the server model, and reports the recognized letter.
 * `onLive` fires every prediction; `onCommit` fires once a letter is stable and
 * confident (so holding a sign appends it a single time).
 *
 * Requests run strictly one-at-a-time (await before scheduling the next), so
 * there is never more than one in-flight call.
 */
export function useAlphabetRecognition({
  videoRef,
  enabled,
  onLive,
  onCommit,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onLive?: (top: Candidate, second: Candidate) => void;
  onCommit?: (letter: string) => void;
}) {
  const [status, setStatus] = useState<AlphabetStatus>("idle");

  const onLiveRef = useRef(onLive);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onLiveRef.current = onLive;
    onCommitRef.current = onCommit;
  });

  useEffect(() => {
    if (!enabled) return;

    let running = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();
    const recent: string[] = [];
    let lastCommitted: string | null = null;

    setStatus("loading");

    async function tick() {
      if (!running) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth) {
        try {
          const cands = await classifyFrame(video, controller.signal);
          if (!running) return;
          if (cands.length) {
            setStatus("ready");
            const top = cands[0];
            const second = cands[1] ?? cands[0];
            onLiveRef.current?.(top, second);

            recent.push(top.text);
            if (recent.length > CONSISTENCY) recent.shift();
            const stable =
              recent.length >= CONSISTENCY && recent.every((p) => p === top.text);
            if (stable && top.confidence >= THRESHOLD && top.text !== lastCommitted) {
              lastCommitted = top.text;
              onCommitRef.current?.(top.text);
            }
          }
        } catch (err) {
          if (!running) return;
          if (err instanceof AlphabetModelLoading) {
            // Model warming up on HF; keep polling without flagging an error.
            setStatus("loading");
          } else if ((err as Error)?.name !== "AbortError") {
            setStatus("error");
          }
        }
      }
      if (running) timer = setTimeout(tick, POLL_INTERVAL_MS);
    }

    void tick();

    return () => {
      running = false;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status };
}
