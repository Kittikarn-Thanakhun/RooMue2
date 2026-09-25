"""
One-off export: download prithivMLmods/Alphabet-Sign-Language-Detection
(a public SigLIP2 image-classification checkpoint on the HF Hub) and convert it
to ONNX so it can run locally. HF no longer serves this model via any free
Inference Provider (inferenceProviderMapping is empty / api-inference.huggingface.co
is decommissioned / the new router endpoint returns 410 Gone for it), so the
app/api/sign-alphabet route now runs this ONNX file directly with
onnxruntime-node instead of proxying to HF.

Output: models/asl-alphabet/model.onnx (~340MB, gitignored — regenerate by
re-running this script, don't commit it) + meta.json (preprocessing + labels).

Dependencies (torch, transformers, onnx) pull in a protobuf version that
conflicts with this project's pinned tensorflow/mediapipe stack (used by
scripts/convert_model.py and scripts/train_thaisignvis.py) — install them into
a throwaway venv instead of the global Python env:

    python -m venv --system-site-packages <short-path>\\venv
    <short-path>\\venv\\Scripts\\pip install transformers torch onnx onnxruntime
    <short-path>\\venv\\Scripts\\python scripts/export_asl_alphabet.py

(A short path matters on Windows — onnx's own package data trips MAX_PATH
inside a deeply nested venv.)
"""
import json
import os

import torch
import torch.nn.functional as F
from transformers import AutoImageProcessor, AutoModelForImageClassification

MODEL_ID = "prithivMLmods/Alphabet-Sign-Language-Detection"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "asl-alphabet")


def _sdpa_fallback(query, key, value, attn_mask=None, dropout_p=0.0, is_causal=False, scale=None):
    """Plain matmul/softmax attention — torch 2.2's ONNX symbolic for the real
    scaled_dot_product_attention op is broken (z_() TypeError on export), so
    swap it out before tracing regardless of the model's attn_implementation."""
    scale = scale if scale is not None else query.size(-1) ** -0.5
    weights = torch.matmul(query, key.transpose(-2, -1)) * scale
    if attn_mask is not None:
        weights = weights + attn_mask
    weights = torch.softmax(weights, dim=-1)
    return torch.matmul(weights, value)


F.scaled_dot_product_attention = _sdpa_fallback


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    print("Loading processor + model from the Hub…")
    processor = AutoImageProcessor.from_pretrained(MODEL_ID)
    # eager attention avoids torch's scaled_dot_product_attention op, whose
    # ONNX symbolic export is broken in torch 2.2 (z_() TypeError on export).
    model = AutoModelForImageClassification.from_pretrained(
        MODEL_ID, attn_implementation="eager"
    )
    model.eval()

    size = processor.size.get("height") or processor.size.get("shortest_edge") or 224
    mean = processor.image_mean
    std = processor.image_std
    id2label = {int(k): v for k, v in model.config.id2label.items()}

    print(f"Input size={size} mean={mean} std={std}")
    print(f"{len(id2label)} classes:", list(id2label.values()))

    dummy = torch.zeros(1, 3, size, size, dtype=torch.float32)
    onnx_path = os.path.join(OUT_DIR, "model.onnx")
    torch.onnx.export(
        model,
        (dummy,),
        onnx_path,
        input_names=["pixel_values"],
        output_names=["logits"],
        dynamic_axes={"pixel_values": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=14,
    )
    print("Exported ONNX ->", onnx_path)

    with open(os.path.join(OUT_DIR, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "source": MODEL_ID,
                "inputSize": size,
                "mean": mean,
                "std": std,
                "id2label": id2label,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print("Wrote meta.json (preprocessing + label map)")


if __name__ == "__main__":
    main()
