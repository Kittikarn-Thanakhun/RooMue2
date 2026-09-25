"""
Convert the AruchaK/Mediapipe_ThaiHandSign model to a TensorFlow.js LayersModel
for in-browser inference in Roo_mue.

Targets the 29-word `actions3.h5` (258-dim: pose 33x4 + left/right hand 21x3).
Outputs model.json + weight shard(s) + labels.json + meta.json into
public/models/thsl/, which the app loads at /models/thsl/model.json.

Usage (needs Windows-compatible deps — tfjs 4.x pulls tensorflow-decision-forests
which is unavailable on Windows, so pin to the 3.x line):

    pip install "tensorflow-cpu==2.15.0" "tensorflowjs==3.18.0" "protobuf<4.24" h5py
    # place actions3.h5 next to this script (download from the repo), then:
    python scripts/convert_model.py path/to/actions3.h5
"""
import json
import os
import sys

import tensorflow as tf
import tensorflowjs as tfjs
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input

NUM = 29
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "models", "thsl")

# 29-word label array, verbatim from the repo's hand_app.py (training order).
LABELS = [
    'สวัสดี','รอ','ขอบคุณ','กลับ','รัก','ตัด','หา','ขึ้น','ลง','ยก','พา','ช่วย',
    'เชื่อ','คุย','ฟัง','สูง','ยืม','เอา','รู้จัก','บน','โกหก','กิน','กระโดด',
    'รวม','วิ่ง','ไป','โง่','พักผ่อน','ได้ยิน'
]


def build():
    """Rebuild the 29-word LSTM architecture for loading a weights-only .h5 file."""
    model = Sequential()
    model.add(Input(shape=(30, 258)))
    model.add(LSTM(128, return_sequences=True, activation="relu"))
    model.add(LSTM(64, return_sequences=False, activation="relu"))
    model.add(Dense(32, activation="relu"))
    model.add(Dense(NUM, activation="softmax"))
    return model


def main():
    """Load actions3.h5 (full model, or weights into a rebuilt model) and export to TFJS."""
    h5 = sys.argv[1] if len(sys.argv) > 1 else "actions3.h5"
    assert len(LABELS) == NUM
    try:
        model = tf.keras.models.load_model(h5, compile=False)
        print("loaded full model from", h5)
    except Exception as e:  # weights-only file
        print("full load failed (", e, ") -> rebuilding architecture")
        model = build()
        model.load_weights(h5)

    out = os.path.abspath(OUT)
    os.makedirs(out, exist_ok=True)
    tfjs.converters.save_keras_model(model, out)
    with open(os.path.join(out, "labels.json"), "w", encoding="utf-8") as f:
        json.dump(LABELS, f, ensure_ascii=False, indent=2)
    with open(os.path.join(out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({"seqLen": 30, "featureDim": 258, "numClasses": NUM,
                   "source": os.path.basename(h5)}, f, ensure_ascii=False, indent=2)
    print("DONE ->", out)


if __name__ == "__main__":
    main()
