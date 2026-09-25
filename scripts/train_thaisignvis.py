"""
Train a Thai Sign Language model on the ThaiSignVis Kaggle dataset and export
it to TensorFlow.js so it drops directly into Roo_mue's in-browser inference.

  Kaggle: thanawuttimpitak/thaisignvis

WHY THIS SHAPE: the app runs MediaPipe Holistic in the browser and feeds the
TFJS model a sequence of 30 frames x 258 features
  (pose 33*(x,y,z,visibility)=132 + left hand 21*3=63 + right hand 21*3=63).
This script extracts the SAME 258-dim features so the trained model is a
drop-in replacement — no front-end changes needed.

--------------------------------------------------------------------------------
RUN THIS ON A GPU (Google Colab "T4 GPU" runtime is free and recommended).
CPU training of an LSTM over video-derived sequences is very slow.

  pip install mediapipe opencv-python tensorflow tensorflowjs scikit-learn tqdm kagglehub

  # Auth: put your kaggle.json token where the Kaggle API expects it, or use kagglehub.
  python scripts/train_thaisignvis.py

ASSUMPTIONS (adjust DATA_ROOT / discovery if your copy differs):
  * The dataset contains short VIDEO clips, one sign per clip, grouped by label:
        <root>/<label_name>/<clip>.mp4        (or .avi/.mov/.mkv)
    optionally nested under a split folder (train/val). The script searches for
    any folder that directly contains video files and treats its name as the label.
  * If ThaiSignVis is instead static IMAGES (one frame per sign), this sequence
    model is the wrong approach — tell the assistant and it will switch the app
    + training to a single-frame classifier.

NO GUARANTEE of >90%: final accuracy depends on data quality/quantity and tuning.
The architecture, augmentation, and callbacks below are set up to give it a good
shot; inspect the printed val/test accuracy and iterate (epochs, units, dropout).
--------------------------------------------------------------------------------
"""
import json
import os
import sys

import numpy as np

SEQ_LEN = 30
FEATURE_DIM = 258
VIDEO_EXTS = (".mp4", ".avi", ".mov", ".mkv", ".webm")

# Set this to your dataset path (kagglehub returns one; or hardcode a folder).
DATA_ROOT = os.environ.get("THAISIGNVIS_ROOT", "")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "models", "thsl")


# ---- 1. Locate the dataset --------------------------------------------------
def resolve_root() -> str:
    """Return the dataset root, downloading it via kagglehub if not set locally."""
    if DATA_ROOT and os.path.isdir(DATA_ROOT):
        return DATA_ROOT
    try:
        import kagglehub
        path = kagglehub.dataset_download("thanawuttimpitak/thaisignvis")
        print("Downloaded to:", path)
        return path
    except Exception as e:
        sys.exit(
            f"Could not locate dataset. Set THAISIGNVIS_ROOT or install kagglehub.\n{e}"
        )


def discover_classes(root: str) -> dict[str, list[str]]:
    """Map label -> list of video paths. A label is any dir that directly holds videos."""
    classes: dict[str, list[str]] = {}
    for dirpath, _dirs, files in os.walk(root):
        vids = [f for f in files if f.lower().endswith(VIDEO_EXTS)]
        if vids:
            label = os.path.basename(dirpath)
            classes.setdefault(label, []).extend(os.path.join(dirpath, v) for v in vids)
    if not classes:
        sys.exit(f"No videos found under {root}. Check the structure / see ASSUMPTIONS.")
    return classes


# ---- 2. Extract the same 258-dim Holistic features the browser uses ---------
def extract_sequence(video_path: str, holistic) -> np.ndarray | None:
    """Run Holistic over a clip and return its 258-dim per-frame features, resampled
    to SEQ_LEN frames. Returns None if the video yields no readable frames."""
    import cv2
    cap = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = holistic.process(image)
        frames.append(keypoints_258(res))
    cap.release()
    if not frames:
        return None
    return resample(np.array(frames, dtype=np.float32), SEQ_LEN)


def keypoints_258(res) -> np.ndarray:
    """Flatten one Holistic result into the 258-dim vector (pose 132 + hands 63 + 63),
    zero-filling any landmark group MediaPipe did not detect."""
    pose = (
        np.array([[p.x, p.y, p.z, p.visibility] for p in res.pose_landmarks.landmark]).flatten()
        if res.pose_landmarks else np.zeros(33 * 4)
    )
    lh = (
        np.array([[p.x, p.y, p.z] for p in res.left_hand_landmarks.landmark]).flatten()
        if res.left_hand_landmarks else np.zeros(21 * 3)
    )
    rh = (
        np.array([[p.x, p.y, p.z] for p in res.right_hand_landmarks.landmark]).flatten()
        if res.right_hand_landmarks else np.zeros(21 * 3)
    )
    return np.concatenate([pose, lh, rh]).astype(np.float32)  # 258


def resample(seq: np.ndarray, target: int) -> np.ndarray:
    """Uniformly sample/pad a variable-length sequence to exactly `target` frames."""
    n = len(seq)
    if n == target:
        return seq
    idx = np.linspace(0, n - 1, target).round().astype(int)
    return seq[idx]


def build_dataset(classes: dict[str, list[str]]):
    """Extract feature sequences for every clip and return (X, y, labels)."""
    import mediapipe as mp
    from tqdm import tqdm
    labels = sorted(classes.keys())
    label_to_idx = {label: i for i, label in enumerate(labels)}
    X, y = [], []
    with mp.solutions.holistic.Holistic(
        min_detection_confidence=0.5, min_tracking_confidence=0.5
    ) as holistic:
        for label in labels:
            for vid in tqdm(classes[label], desc=label):
                seq = extract_sequence(vid, holistic)
                if seq is not None and len(seq) == SEQ_LEN:
                    X.append(seq)
                    y.append(label_to_idx[label])
    return np.array(X, dtype=np.float32), np.array(y), labels


# ---- 3. Model (identical to the app's inference architecture) ---------------
def build_model(num_classes: int):
    """Build and compile the LSTM classifier (identical to the app's inference model)."""
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
    model = Sequential([
        Input(shape=(SEQ_LEN, FEATURE_DIM)),
        LSTM(128, return_sequences=True, activation="relu"),
        Dropout(0.3),
        LSTM(64, return_sequences=False, activation="relu"),
        Dropout(0.3),
        Dense(32, activation="relu"),
        Dense(num_classes, activation="softmax"),
    ])
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def load_features(classes: dict[str, list[str]]):
    """Return (X, y, labels), reusing the cached feature archive when it exists."""
    cache = os.path.join(os.path.dirname(__file__), "thaisignvis_features.npz")
    if os.path.exists(cache):
        data = np.load(cache, allow_pickle=True)
        return data["X"], data["y"], list(data["labels"])
    X, y, labels = build_dataset(classes)
    np.savez_compressed(cache, X=X, y=y, labels=np.array(labels, dtype=object))
    return X, y, labels


def split_dataset(X: np.ndarray, y: np.ndarray):
    """Stratified split into train/val/test (70/15/15), returned as (X, y) pairs."""
    from sklearn.model_selection import train_test_split
    X_train, X_tmp, y_train, y_tmp = train_test_split(
        X, y, test_size=0.3, stratify=y, random_state=42
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_tmp, y_tmp, test_size=0.5, stratify=y_tmp, random_state=42
    )
    return (X_train, y_train), (X_val, y_val), (X_test, y_test)


def train_model(model, train, val):
    """Fit the model with early stopping and LR reduction on the val split."""
    import tensorflow as tf
    X_train, y_train = train
    X_val, y_val = val
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=200, batch_size=32,
        callbacks=[
            tf.keras.callbacks.EarlyStopping(patience=20, restore_best_weights=True, monitor="val_accuracy"),
            tf.keras.callbacks.ReduceLROnPlateau(patience=8, factor=0.5),
        ],
    )


def export_tfjs(model, labels, test_accuracy: float):
    """Save the TFJS model plus labels.json and meta.json into OUT_DIR."""
    import tensorflowjs as tfjs
    out = os.path.abspath(OUT_DIR)
    os.makedirs(out, exist_ok=True)
    tfjs.converters.save_keras_model(model, out)
    with open(os.path.join(out, "labels.json"), "w", encoding="utf-8") as f:
        json.dump(list(labels), f, ensure_ascii=False, indent=2)
    with open(os.path.join(out, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({"seqLen": SEQ_LEN, "featureDim": FEATURE_DIM,
                   "numClasses": len(labels), "source": "thaisignvis",
                   "testAccuracy": round(float(test_accuracy), 4)}, f, ensure_ascii=False, indent=2)
    print("Exported TFJS model ->", out)


def main():
    """Locate the dataset, extract features, train the LSTM, and export it to TFJS."""
    root = resolve_root()
    classes = discover_classes(root)
    print(f"{len(classes)} classes:", sorted(classes)[:10], "...")

    X, y, labels = load_features(classes)
    print("Dataset:", X.shape, "labels:", len(labels))

    train, val, (X_test, y_test) = split_dataset(X, y)

    model = build_model(len(labels))
    model.summary()
    train_model(model, train, val)

    _, acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"\n==> TEST ACCURACY: {acc*100:.2f}%  (target > 90%)")

    export_tfjs(model, labels, acc)


if __name__ == "__main__":
    main()
