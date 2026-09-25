/**
 * Replicates the Python `extract_keypoints` from AruchaK/Mediapipe_ThaiHandSign
 * exactly, so the in-browser feature vector matches the model's training input.
 *
 *   pose: 33 landmarks * (x, y, z, visibility) = 132
 *   left hand:  21 * (x, y, z) = 63
 *   right hand: 21 * (x, y, z) = 63
 *   total = 258   (face is intentionally excluded — it was dead code upstream)
 */

export const FEATURE_DIM = 258;
export const SEQ_LEN = 30;

type LM = { x: number; y: number; z: number; visibility?: number };
export interface HolisticResults {
  poseLandmarks?: LM[];
  leftHandLandmarks?: LM[];
  rightHandLandmarks?: LM[];
  faceLandmarks?: LM[];
}

export function extractKeypoints(results: HolisticResults): Float32Array {
  const out = new Float32Array(FEATURE_DIM); // zero-filled (matches np.zeros)
  let i = 0;

  const pose = results.poseLandmarks;
  if (pose) {
    for (let p = 0; p < 33; p++) {
      const lm = pose[p];
      out[i++] = lm?.x ?? 0;
      out[i++] = lm?.y ?? 0;
      out[i++] = lm?.z ?? 0;
      out[i++] = lm?.visibility ?? 0;
    }
  } else {
    i += 33 * 4;
  }

  i = writeHand(out, i, results.leftHandLandmarks);
  i = writeHand(out, i, results.rightHandLandmarks);

  return out;
}

function writeHand(out: Float32Array, start: number, hand?: LM[]): number {
  let i = start;
  if (hand) {
    for (let p = 0; p < 21; p++) {
      const lm = hand[p];
      out[i++] = lm?.x ?? 0;
      out[i++] = lm?.y ?? 0;
      out[i++] = lm?.z ?? 0;
    }
  } else {
    i += 21 * 3;
  }
  return i;
}

// ---- Face analytics (derived from the face mesh; model does not use these) --

export type FaceSignals = { smile: number; eyesOpen: number; mouthOpen: number };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const dist = (a: LM, b: LM) => Math.hypot(a.x - b.x, a.y - b.y);

export function faceSignals(results: HolisticResults): FaceSignals | null {
  const f = results.faceLandmarks;
  if (!f || f.length < 468) return null;

  const faceH = dist(f[10], f[152]) || 1; // forehead → chin
  const faceW = dist(f[234], f[454]) || 1; // cheek → cheek

  // Mouth open: inner lip gap vs face height.
  const mouthOpen = clamp01((dist(f[13], f[14]) / faceH) * 6);
  // Smile: mouth corner spread vs face width.
  const mouthWidth = dist(f[61], f[291]) / faceW;
  const smile = clamp01((mouthWidth - 0.38) * 6);
  // Eyes open: average vertical eye opening vs face height.
  const eyeL = dist(f[159], f[145]);
  const eyeR = dist(f[386], f[374]);
  const eyesOpen = clamp01(((eyeL + eyeR) / 2 / faceH) * 22);

  return { smile, eyesOpen, mouthOpen };
}
