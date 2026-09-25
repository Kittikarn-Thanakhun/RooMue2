"use client";

import type { Candidate } from "./types";

/**
 * Client for the ASL alphabet (A–Z) mode. Grabs a single frame from the live
 * video, center-crops it to a 224×224 square (the SigLIP input size), and posts
 * the JPEG to our server proxy, which forwards it to the HuggingFace model.
 *
 * The frame is drawn straight from the video (un-mirrored) even though the
 * preview is shown mirrored, so the hand orientation matches the model's
 * training data.
 */

const INPUT_SIZE = 224;

// One reused offscreen canvas to avoid per-frame allocation.
let scratch: HTMLCanvasElement | null = null;
function getCanvas(): HTMLCanvasElement {
  if (!scratch) {
    scratch = document.createElement("canvas");
    scratch.width = INPUT_SIZE;
    scratch.height = INPUT_SIZE;
  }
  return scratch;
}

export class AlphabetModelLoading extends Error {
  constructor() {
    super("model_loading");
    this.name = "AlphabetModelLoading";
  }
}

/** Captures the current frame and returns the top-2 predicted letters. */
export async function classifyFrame(
  video: HTMLVideoElement,
  signal?: AbortSignal
): Promise<Candidate[]> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return [];

  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  // Center square crop -> 224×224.
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;
  ctx.drawImage(video, sx, sy, side, side, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );
  if (!blob) return [];

  const res = await fetch("/api/sign-alphabet", {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
    signal,
  });

  if (res.status === 503) throw new AlphabetModelLoading();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `http_${res.status}`);
  }

  const { candidates } = (await res.json()) as { candidates: Candidate[] };
  return candidates ?? [];
}
