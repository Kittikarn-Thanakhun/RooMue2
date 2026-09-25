"use client";

import * as tf from "@tensorflow/tfjs";
import { FEATURE_DIM, SEQ_LEN } from "@/lib/holistic/keypoints";
import type { Candidate } from "./types";

const BASE = "/models/thsl";

// Disable debug checks for a small inference speedup.
tf.enableProdMode();

let modelPromise: Promise<tf.LayersModel> | null = null;
let labelsPromise: Promise<string[]> | null = null;
let available: boolean | null = null;

// Reused across inferences to avoid per-call allocation / GC churn.
const inputBuffer = new Float32Array(SEQ_LEN * FEATURE_DIM);

/** True once we've confirmed the converted model is actually hosted. */
export async function isModelAvailable(): Promise<boolean> {
  if (available !== null) return available;
  try {
    const res = await fetch(`${BASE}/model.json`, { method: "HEAD" });
    available = res.ok;
  } catch {
    available = false;
  }
  return available;
}

function getModel() {
  if (!modelPromise) modelPromise = tf.loadLayersModel(`${BASE}/model.json`);
  return modelPromise;
}

function getLabels() {
  if (!labelsPromise) {
    labelsPromise = fetch(`${BASE}/labels.json`).then((r) => r.json());
  }
  return labelsPromise;
}

/** The vocabulary the model knows — used for correction quick-pick suggestions. */
export async function getKnownLabels(): Promise<string[]> {
  try {
    return await getLabels();
  } catch {
    return [];
  }
}

/** Warm up the backend + model so the first real translate isn't slow. */
export async function warmUp(): Promise<void> {
  // Prefer the GPU (WebGL) backend; fall back to whatever is available.
  try {
    if (tf.getBackend() !== "webgl") await tf.setBackend("webgl");
  } catch {
    /* keep default backend */
  }
  await tf.ready();

  const model = await getModel();
  await getLabels();
  const out = tf.tidy(() => model.predict(tf.zeros([1, SEQ_LEN, FEATURE_DIM])) as tf.Tensor);
  await out.data();
  out.dispose();
}

/**
 * Runs the LSTM on a sequence of per-frame 258-dim vectors. Pads the front
 * with zero frames if fewer than 30 were captured (mirrors `sequence[-30:]`).
 */
export async function predictSequence(
  frames: Float32Array[]
): Promise<[Candidate, Candidate]> {
  const model = await getModel();
  const labels = await getLabels();

  // Fill the reused buffer; pad the front with zeros if fewer than 30 frames.
  inputBuffer.fill(0);
  const recent = frames.slice(-SEQ_LEN);
  const offset = SEQ_LEN - recent.length;
  for (let f = 0; f < recent.length; f++) {
    inputBuffer.set(recent[f], (offset + f) * FEATURE_DIM);
  }

  const logits = tf.tidy(
    () => model.predict(tf.tensor(inputBuffer, [1, SEQ_LEN, FEATURE_DIM])) as tf.Tensor
  );
  const scores = Array.from(await logits.data());
  logits.dispose();

  const ranked = scores
    .map((confidence, index) => ({ confidence, index }))
    .sort((a, b) => b.confidence - a.confidence);

  const toCandidate = (r: { confidence: number; index: number }): Candidate => ({
    text: labels[r.index] ?? `#${r.index}`,
    confidence: r.confidence,
  });

  return [toCandidate(ranked[0]), toCandidate(ranked[1])];
}
