"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useAlphabetRecognition } from "@/lib/call/use-alphabet-recognition";
import { useSpeak } from "@/lib/tts";
import { saveSession } from "@/app/app/actions";
import type { Candidate } from "@/lib/translation";

type Phase = "permission" | "starting" | "denied" | "live";

/**
 * ASL alphabet (A–Z) fingerspelling mode. Unlike the Thai-word camera, this
 * runs the SigLIP model on the server (HuggingFace), so it captures one frame
 * at a time and the permission copy is explicit that frames leave the device.
 * Recognized letters are appended into a spelled string the user can read aloud
 * or save.
 */
export function AlphabetTranslate({ onClose }: { onClose: () => void }) {
  const t = useTranslations("app.alphabet");
  // The letters are English, so speak them with an English voice.
  const { say } = useSpeak("en");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("permission");
  const [insecure, setInsecure] = useState(false);
  const [live, setLive] = useState<Candidate | null>(null);
  const [letters, setLetters] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

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

  const { status } = useAlphabetRecognition({
    videoRef,
    enabled: phase === "live",
    onLive: (top) => setLive(top),
    onCommit: (letter) => {
      setLetters((prev) => [...prev, letter].slice(-40));
      setSaved(false);
      say(letter);
    },
  });

  useEffect(() => () => stopStream(), [stopStream]);

  const spelled = lettersToText(letters);

  async function saveWord() {
    const text = spelled.trim();
    if (!text) return;
    // Stored under the everyday/"alphabet" bucket; history schema is unchanged.
    await saveSession({
      mode: "everyday",
      contextTag: "alphabet",
      sentence: text,
      candidates: live ? [live] : undefined,
      source: "camera",
    });
    setSaved(true);
  }

  const gateOpen = phase === "permission" || phase === "denied";

  return (
    <div className="relative grid gap-4 lg:grid-cols-[6fr_4fr]">
      {/* Left: camera preview */}
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 size-full -scale-x-100 object-cover"
          />
          {/* Square hint where the model looks (center crop). */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="aspect-square h-[80%] rounded-xl border-2 border-white/40" />
          </div>
          {phase === "starting" && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white">
              {t("starting")}
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {status === "ready" && (
              <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden />
            )}
            {t("frameHint")}
          </div>
        </div>
      </Card>

      {/* Right: recognized letter + spelled word */}
      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        {status === "ready" && (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
            {t("live")}
          </p>
        )}
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">{t("modelLoading")}</p>
        )}
        {status === "error" && (
          <p className="text-sm text-destructive">{t("modelError")}</p>
        )}

        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("recognized")}</p>
          {live ? (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-5xl font-extrabold tabular-nums">{live.text}</span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {Math.round(live.confidence * 100)}%
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t("raiseHand")}</p>
          )}
        </div>

        {/* Spelled-out word */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("spelled")}</p>
          <div className="min-h-14 break-words rounded-lg bg-secondary/60 p-3 text-2xl font-bold tracking-wide">
            {spelled || <span className="text-base font-normal text-muted-foreground">{t("empty")}</span>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setLetters((p) => [...p, " "])} disabled={letters.length === 0}>
              {t("space")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLetters((p) => p.slice(0, -1))} disabled={letters.length === 0}>
              <Icons.back className="size-4" aria-hidden />
              {t("backspace")}
            </Button>
          </div>
        </div>

        <div className="mt-auto grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => say(spelled)} disabled={!spelled.trim()}>
            <Icons.playAudio className="size-5" aria-hidden />
            {t("play")}
          </Button>
          <Button onClick={saveWord} disabled={!spelled.trim()}>
            <Icons.confirm className="size-5" aria-hidden />
            {t("save")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setLetters([]);
              setSaved(false);
            }}
            disabled={letters.length === 0}
          >
            {t("clear")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              stopStream();
              onClose();
            }}
          >
            <Icons.close className="size-5" aria-hidden />
            {t("stop")}
          </Button>
        </div>

        {saved && (
          <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <Icons.confirm className="size-4" aria-hidden />
            {t("saved")}
          </p>
        )}
      </Card>

      {/* Permission gate — explicit that frames are sent to a server. */}
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

/** Joins committed tokens; explicit spaces become real spaces, letters concat. */
function lettersToText(tokens: string[]): string {
  return tokens.join("").replace(/\s+/g, " ");
}
