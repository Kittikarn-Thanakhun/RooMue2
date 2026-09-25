"""Pre-generate natural-sounding audio for the fixed emergency phrases.

Why: the emergency preset phrases must play *instantly* with no network delay,
but online neural voices sound far more human than the browser's offline ones.
Since these phrases are fixed (5 per language), we render them once to static
MP3s with Microsoft Edge's free neural voices and ship them in /public. The app
then just plays the file — instant *and* natural.

Usage (from the repo root):
    pip install edge-tts
    python scripts/generate-emergency-tts.py

Re-run this whenever the phrase text in messages/{th,en}.json changes.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

# Thai phrases in log output break on Windows' default cp1252 console.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "audio" / "emergency"

# Natural neural voices, one per UI locale.
VOICES = {
    "th": "th-TH-PremwadeeNeural",
    "en": "en-US-AriaNeural",
}

# Slightly slower delivery reads as calmer and clearer for emergencies.
RATE = "-5%"


def load_phrases(locale: str) -> dict[str, str]:
    data = json.loads((ROOT / "messages" / f"{locale}.json").read_text("utf-8"))
    return data["app"]["preset"]["phrases"]


def render(locale: str, key: str, text: str) -> None:
    out = OUT_DIR / locale / f"{key}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    # Shell out to the edge-tts CLI: its async API hits an event-loop bug on
    # Windows, but the CLI is reliable. The service occasionally returns no
    # audio when hit too quickly, so retry with a short backoff.
    cmd = [
        sys.executable, "-m", "edge_tts",
        "--voice", VOICES[locale],
        # Use "--opt=val" so argparse doesn't read a leading "-" rate as a flag.
        f"--rate={RATE}",
        "--text", text,
        "--write-media", str(out),
    ]
    last_err = ""
    for attempt in range(1, 5):
        try:
            # edge-tts can hang on a stalled websocket; cap each attempt so a
            # hung call is killed and retried instead of blocking forever.
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30
            )
        except subprocess.TimeoutExpired:
            last_err = "timed out"
            time.sleep(attempt)
            continue
        if result.returncode == 0 and out.exists() and out.stat().st_size > 0:
            print(f"  {locale}/{key}.mp3  <-  {text}")
            time.sleep(0.4)  # be gentle on the free endpoint
            return
        last_err = result.stderr.strip()
        time.sleep(attempt)  # linear backoff: 1s, 2s, 3s
    raise RuntimeError(f"failed to render {locale}/{key} after retries:\n{last_err}")


def main() -> None:
    for locale in VOICES:
        phrases = load_phrases(locale)
        print(f"[{locale}] {VOICES[locale]}")
        for key, text in phrases.items():
            render(locale, key, text)
    print(f"\nDone -> {OUT_DIR}")


if __name__ == "__main__":
    main()
