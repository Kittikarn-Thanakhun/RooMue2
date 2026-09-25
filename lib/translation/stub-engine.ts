import type {
  Candidate,
  TranslationEngine,
  TranslationRequest,
  TranslationResult,
} from "./types";

/**
 * Placeholder translation engine.
 *
 * Returns two plausible candidate meanings derived from the requested mode so
 * the full UI flow (camera -> landmarks -> pick-a-meaning -> TTS) can be built
 * and demoed end-to-end. Replace with a real model/API by implementing
 * `TranslationEngine` and swapping the export in `./index.ts`.
 */

const SAMPLES: Record<
  TranslationRequest["mode"],
  Record<"th" | "en", string[]>
> = {
  emergency: {
    th: [
      "ฉันต้องการความช่วยเหลือ",
      "โทรเรียกรถพยาบาลด้วย",
      "ฉันเจ็บปวดมาก",
      "โทรเรียกตำรวจด้วย",
    ],
    en: [
      "I need help",
      "Please call an ambulance",
      "I am in a lot of pain",
      "Please call the police",
    ],
  },
  everyday: {
    th: [
      "สวัสดีครับ ยินดีที่ได้รู้จัก",
      "ฉันอยากสั่งอาหาร",
      "ห้องน้ำอยู่ที่ไหน",
      "ขอบคุณมากครับ",
    ],
    en: [
      "Hello, nice to meet you",
      "I would like to order food",
      "Where is the restroom",
      "Thank you very much",
    ],
  },
};

function pickTwo(pool: string[], seed: number): [string, string] {
  const a = pool[seed % pool.length];
  const b = pool[(seed + 1) % pool.length];
  return [a, b];
}

export const stubEngine: TranslationEngine = {
  name: "stub",
  async translate(req: TranslationRequest): Promise<TranslationResult> {
    // Simulate inference latency.
    await new Promise((r) => setTimeout(r, 350));

    const pool = SAMPLES[req.mode][req.locale];
    const seed = req.frames.length + (req.face?.smile ? 1 : 0);
    const [first, second] = pickTwo(pool, seed);

    const candidates: [Candidate, Candidate] = [
      { text: first, confidence: 0.82 + (seed % 5) / 100 },
      { text: second, confidence: 0.64 + (seed % 7) / 100 },
    ];

    return { candidates, engine: this.name };
  },
};
