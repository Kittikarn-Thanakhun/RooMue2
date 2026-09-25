import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import * as ort from "onnxruntime-node";
import sharp from "sharp";

/**
 * Runs the ASL alphabet (A–Z) classifier locally with onnxruntime-node.
 *
 * This used to proxy to the HuggingFace Inference API for
 * `prithivMLmods/Alphabet-Sign-Language-Detection`, but HF decommissioned the
 * free serverless endpoint entirely (api-inference.huggingface.co no longer
 * resolves, and the replacement router.huggingface.co returns 410 Gone for
 * this model — it has no active Inference Provider). The model itself is
 * still a public, permissively-licensed checkpoint, so scripts/export_asl_alphabet.py
 * exports it to ONNX once and this route runs it directly instead.
 *
 * The frame therefore never leaves this server process (previously it left
 * the device for HF's servers) — see components/app/alphabet-translate.tsx's
 * permission copy, which should be updated to reflect that if this becomes
 * the long-term approach.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_DIR = path.join(process.cwd(), "models", "asl-alphabet");
const MODEL_PATH = path.join(MODEL_DIR, "model.onnx");
const META_PATH = path.join(MODEL_DIR, "meta.json");

type Meta = {
  inputSize: number;
  mean: number[];
  std: number[];
  id2label: Record<string, string>;
};

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let meta: Meta | null = null;

function getMeta(): Meta {
  if (!meta) {
    meta = JSON.parse(fs.readFileSync(META_PATH, "utf-8")) as Meta;
  }
  return meta;
}

function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["cpu"],
    });
  }
  return sessionPromise;
}

/** JPEG bytes -> normalized NCHW Float32 tensor matching the export's preprocessor. */
async function preprocess(bytes: Buffer, m: Meta): Promise<ort.Tensor> {
  const { data } = await sharp(bytes)
    .resize(m.inputSize, m.inputSize, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const n = m.inputSize * m.inputSize;
  const out = new Float32Array(3 * n);
  // sharp gives interleaved HWC (RGB); the model wants planar CHW.
  for (let px = 0; px < n; px++) {
    out[px] = (data[px * 3] / 255 - m.mean[0]) / m.std[0];
    out[n + px] = (data[px * 3 + 1] / 255 - m.mean[1]) / m.std[1];
    out[2 * n + px] = (data[px * 3 + 2] / 255 - m.mean[2]) / m.std[2];
  }
  return new ort.Tensor("float32", out, [1, 3, m.inputSize, m.inputSize]);
}

function softmax(logits: Float32Array): Float32Array {
  const max = Math.max(...logits);
  const exps = Float32Array.from(logits, (v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum) as Float32Array;
}

export async function POST(req: Request) {
  if (!fs.existsSync(MODEL_PATH)) {
    return NextResponse.json({ error: "model_missing" }, { status: 500 });
  }

  const body = await req.arrayBuffer();
  if (!body.byteLength) {
    return NextResponse.json({ error: "empty_image" }, { status: 400 });
  }

  try {
    const m = getMeta();
    const [session, input] = await Promise.all([
      getSession(),
      preprocess(Buffer.from(body), m),
    ]);

    const outputs = await session.run({ pixel_values: input });
    const logits = outputs.logits.data as Float32Array;
    const probs = softmax(logits);

    const ranked = Array.from(probs)
      .map((confidence, index) => ({ confidence, index }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2)
      .map((r) => ({ text: m.id2label[String(r.index)] ?? `#${r.index}`, confidence: r.confidence }));

    return NextResponse.json({ candidates: ranked });
  } catch (err) {
    return NextResponse.json(
      { error: "inference_failed", detail: String(err).slice(0, 500) },
      { status: 500 }
    );
  }
}
