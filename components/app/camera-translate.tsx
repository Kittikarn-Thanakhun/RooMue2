"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { RecognitionPanel } from "./recognition-panel";
import { useSignRecognition } from "@/lib/call/use-sign-recognition";
import { useSpeak } from "@/lib/tts";
import { saveSession } from "@/app/app/actions";
import { getKnownLabels } from "@/lib/translation/tfjs-client";
import { composeSentences } from "@/lib/sentence/compose";
import type { Candidate } from "@/lib/translation";

type Phase = "permission" | "starting" | "denied" | "live";

export function CameraTranslate({
  mode,
  contextTag,
  onClose,
}: {
  mode: "emergency" | "everyday";
  contextTag: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("app.camera");
  const locale = useLocale() as "th" | "en";
  const { say } = useSpeak(locale);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("permission");
  const [insecure, setInsecure] = useState(false);
  const [liveTop, setLiveTop] = useState<Candidate | null>(null);
  const [liveSecond, setLiveSecond] = useState<Candidate | null>(null);
  const [sentence, setSentence] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [vocab, setVocab] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    getKnownLabels().then(setVocab).catch(() => {});
  }, []);

  // Compose complete-sentence suggestions from the recognized words.
  const suggestions = useMemo(
    () => composeSentences(sentence, locale),
    [sentence, locale]
  );
  useEffect(() => setSelectedIdx(0), [sentence]);
  const chosenText =
    suggestions[selectedIdx]?.text ?? suggestions[0]?.text ?? sentence.join(" ");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    setInsecure(false);
    setPhase("starting");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setInsecure(typeof window !== "undefined" && !window.isSecureContext);
      setPhase("denied");
      return;
    }

    try {
      // 640x480 is plenty for landmark detection and far lighter than 720p.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      let tries = 0;
      while (!videoRef.current && tries++ < 20) {
        await new Promise((r) => setTimeout(r, 25));
      }
      const video = videoRef.current;
      if (!video) throw new Error("video element unavailable");
      video.srcObject = stream;
      await video.play().catch(() => {});
      setPhase("live");
    } catch {
      stopStream();
      setPhase("denied");
    }
  }, [stopStream]);

  // Single shared recognition pipeline (Holistic + TFJS), enabled while live.
  const { status, handCount, face } = useSignRecognition({
    videoRef,
    canvasRef,
    enabled: phase === "live",
    onLive: (top, second) => {
      setLiveTop(top);
      setLiveSecond(second);
    },
    onCommit: (word) => {
      setSentence((prev) => [...prev, word].slice(-12));
      setSaved(false);
      say(word);
    },
  });

  useEffect(() => () => stopStream(), [stopStream]);

  async function saveSentence() {
    const text = chosenText.trim();
    if (!text) return;
    try {
      const res = await saveSession({
        mode,
        contextTag,
        sentence: text,
        candidates: liveTop && liveSecond ? [liveTop, liveSecond] : undefined,
        source: "camera",
      });
      setSaved(res.ok);
    } catch {
      // Saving history is best-effort; ignore failures.
    }
  }

  function clearSentence() {
    setSentence([]);
    setSaved(false);
  }

  const gateOpen = phase === "permission" || phase === "denied";

  return (
    <div className="relative mx-auto max-w-xl space-y-4">
      {/* Camera + skeleton overlay */}
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 size-full -scale-x-100 object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 size-full -scale-x-100 object-cover"
          />
          {phase === "starting" && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white">
              {t("starting")}
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {status === "ready" && (
              <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden />
            )}
            {handCount > 0 ? t("handsDetected", { count: handCount }) : t("noHands")}
          </div>
        </div>
      </Card>

      {status === "loading" && (
        <p className="text-sm text-muted-foreground">{t("modelLoading")}</p>
      )}
      {status === "error" && <p className="text-sm text-destructive">{t("modelError")}</p>}

      <RecognitionPanel
        liveTop={liveTop}
        liveSecond={liveSecond}
        onPlayAlternative={say}
        suggestions={suggestions}
        selectedIdx={selectedIdx}
        onSelectSuggestion={setSelectedIdx}
        words={sentence}
        onWordsChange={setSentence}
        vocab={vocab}
        face={face}
        onPlay={() => say(chosenText)}
        onSave={saveSentence}
        onClear={clearSentence}
        onStop={() => {
          stopStream();
          onClose();
        }}
        saved={saved}
        canSave={sentence.length > 0}
        canPlay={Boolean(chosenText)}
      />

      {/* Permission gate overlay: camera never opens without explicit confirm */}
      {gateOpen && (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-xl bg-black/55 p-4">
          <Card className="w-full max-w-md p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Icons.camera className="size-6 text-primary" aria-hidden />
              <h2 className="text-lg font-bold">{t("permissionTitle")}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t("permissionBody")}</p>
            {phase === "denied" && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {insecure ? t("insecure") : t("denied")}
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button className="flex-1" onClick={start}>
                <Icons.confirm className="size-5" aria-hidden />
                {phase === "denied" ? t("retry") : t("allow")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
