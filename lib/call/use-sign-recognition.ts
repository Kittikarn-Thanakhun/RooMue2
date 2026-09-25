"use client";

import { useEffect, useRef, useState } from "react";
import {
  extractKeypoints,
  faceSignals,
  SEQ_LEN,
  type FaceSignals,
  type HolisticResults,
} from "@/lib/holistic/keypoints";
import { isModelAvailable, predictSequence, warmUp } from "@/lib/translation/tfjs-client";
import type { Candidate } from "@/lib/translation";

const HOLISTIC_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629";
const CONSISTENCY = 4;
const THRESHOLD = 0.6;
// Efficiency knobs: cap Holistic to ~24fps and run the LSTM at most ~11/s,
// and only while at least one hand is visible.
const SEND_INTERVAL_MS = 1000 / 24;
const INFER_INTERVAL_MS = 90;

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export type RecognitionStatus = "idle" | "loading" | "ready" | "error";

/**
 * Runs MediaPipe Holistic + the TFJS model on a (already-playing) video
 * element, continuously. Calls `onLive` with the current top-2 candidates and
 * `onCommit` when a word is stable + confident (same gate as the translator).
 */
export function useSignRecognition({
  videoRef,
  canvasRef,
  enabled,
  onLive,
  onCommit,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  enabled: boolean;
  onLive?: (top: Candidate, second: Candidate) => void;
  onCommit?: (word: string) => void;
}) {
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [handCount, setHandCount] = useState(0);
  const [face, setFace] = useState<FaceSignals>({ smile: 0, eyesOpen: 0, mouthOpen: 0 });

  const onLiveRef = useRef(onLive);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onLiveRef.current = onLive;
    onCommitRef.current = onCommit;
  });

  useEffect(() => {
    if (!enabled) return;

    let holistic: any = null;
    let raf: number | null = null;
    let running = true;
    const seq: Float32Array[] = [];
    const preds: string[] = [];
    let lastConfirmed: string | null = null;
    let inferBusy = false;
    let faceTick = 0;
    let modelOk = false;
    let lastSend = 0;
    let lastInfer = 0;

    function onResults(results: HolisticResults) {
      seq.push(extractKeypoints(results));
      if (seq.length > SEQ_LEN) seq.shift();

      const hands =
        (results.leftHandLandmarks ? 1 : 0) + (results.rightHandLandmarks ? 1 : 0);
      setHandCount((prev) => (prev === hands ? prev : hands));

      if (++faceTick % 5 === 0) {
        const fs = faceSignals(results);
        if (fs) setFace(fs);
      }

      drawOverlay(canvasRef.current, videoRef.current, results);

      // Run the LSTM only while hands are visible and at a throttled rate.
      const now = performance.now();
      if (
        modelOk &&
        !inferBusy &&
        hands > 0 &&
        seq.length >= SEQ_LEN &&
        now - lastInfer >= INFER_INTERVAL_MS
      ) {
        lastInfer = now;
        inferBusy = true;
        predictSequence(seq.slice())
          .then(([c0, c1]) => {
            onLiveRef.current?.(c0, c1);
            preds.push(c0.text);
            if (preds.length > CONSISTENCY) preds.shift();
            const stable =
              preds.length >= CONSISTENCY && preds.every((p) => p === c0.text);
            if (stable && c0.confidence >= THRESHOLD && c0.text !== lastConfirmed) {
              lastConfirmed = c0.text;
              onCommitRef.current?.(c0.text);
            }
          })
          .catch(() => {})
          .finally(() => {
            inferBusy = false;
          });
      }
    }

    async function pump() {
      const video = videoRef.current;
      if (!running || !video) return;
      const now = performance.now();
      if (holistic && video.readyState >= 2 && now - lastSend >= SEND_INTERVAL_MS) {
        lastSend = now;
        try {
          await holistic.send({ image: video });
        } catch {
          /* transient */
        }
      }
      if (running) raf = requestAnimationFrame(pump);
    }

    (async () => {
      setStatus("loading");
      try {
        const mod: any = await import("@mediapipe/holistic");
        holistic = new mod.Holistic({
          locateFile: (file: string) => `${HOLISTIC_CDN}/${file}`,
        });
        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          refineFaceLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        holistic.onResults(onResults);
        modelOk = await isModelAvailable();
        if (modelOk) await warmUp();
        setStatus(modelOk ? "ready" : "error");
      } catch {
        setStatus("error");
      }
      void pump();
    })();

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      holistic?.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status, handCount, face };
}

function drawOverlay(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement | null,
  results: HolisticResults
) {
  if (!canvas || !video) return;
  if (canvas.width !== video.videoWidth && video.videoWidth) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  for (const hand of [results.leftHandLandmarks, results.rightHandLandmarks]) {
    if (!hand) continue;
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = Math.max(2, w / 320);
    for (const [a, b] of HAND_CONNECTIONS) {
      if (!hand[a] || !hand[b]) continue;
      ctx.beginPath();
      ctx.moveTo(hand[a].x * w, hand[a].y * h);
      ctx.lineTo(hand[b].x * w, hand[b].y * h);
      ctx.stroke();
    }
    ctx.fillStyle = "#f97316";
    const r = Math.max(3, w / 220);
    for (const p of hand) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
