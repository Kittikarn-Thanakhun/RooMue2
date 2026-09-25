/**
 * Translation engine contract.
 *
 * The TSL -> Thai recognition model is NOT included (there is no off-the-shelf
 * Thai Sign Language model). The rest of the app depends only on this
 * interface, so a real model or inference API can be dropped in later by
 * implementing `TranslationEngine` and swapping the export in `index.ts`.
 */

/** A single normalized MediaPipe hand landmark (image-space, 0..1). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** One frame of captured input: 0, 1 or 2 hands of 21 landmarks each. */
export interface HandFrame {
  /** ms timestamp relative to capture start. */
  t: number;
  hands: Landmark[][];
}

/** Optional face/affect signals used to disambiguate meaning. */
export interface FaceSignals {
  smile?: number; // 0..1
  mouthOpen?: number; // 0..1
  eyesOpen?: number; // 0..1
}

export interface TranslationRequest {
  frames: HandFrame[];
  face?: FaceSignals;
  /** "emergency" | "everyday" — biases candidate selection. */
  mode: "emergency" | "everyday";
  locale: "th" | "en";
}

export interface Candidate {
  /** Translated sentence text in the requested locale. */
  text: string;
  /** Model confidence, 0..1. */
  confidence: number;
}

export interface TranslationResult {
  /** Exactly two candidate meanings for the user to choose between. */
  candidates: [Candidate, Candidate];
  /** Echoed back so the UI can show which engine produced the result. */
  engine: string;
}

export interface TranslationEngine {
  readonly name: string;
  translate(req: TranslationRequest): Promise<TranslationResult>;
}
