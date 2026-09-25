"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useCall, type CaptionMessage, type CallState } from "@/lib/call/use-webrtc";
import { useSignRecognition } from "@/lib/call/use-sign-recognition";
import { useSpeechRecognition } from "@/lib/call/use-speech-recognition";
import { useSpeak } from "@/lib/tts";
import type { Candidate } from "@/lib/translation";

export type CallRole = "signer" | "speaker";

export function CallRoom({
  room,
  peerId,
  role,
  stream,
  onEnd,
  onSendMessage,
}: {
  room: string;
  peerId: string;
  role: CallRole;
  stream: MediaStream;
  onEnd: () => void;
  /** Pushes the local participant's current sign/speech transcript into the
   * persistent chat thread with this contact. Omit to hide the button. */
  onSendMessage?: (text: string) => void;
}) {
  const t = useTranslations("app.call");
  const locale = useLocale() as "th" | "en";
  const { say } = useSpeak(locale);

  const [incoming, setIncoming] = useState<{ text: string; interim: boolean } | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [micOn, setMicOn] = useState(true);

  const onCaption = useCallback(
    (msg: CaptionMessage) => {
      setIncoming({ text: msg.text, interim: msg.final === false });
      // The hearing speaker hears the deaf signer's words read aloud.
      if (role === "speaker" && msg.kind === "sign" && msg.final !== false) {
        say(msg.text);
      }
    },
    [role, say]
  );

  const { state, remoteStream, sendCaption } = useCall({
    room,
    peerId,
    localStream: stream,
    enabled: true,
    onCaption,
  });

  // Remote audio playback.
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);
    stream.getAudioTracks().forEach((tr) => (tr.enabled = next));
  }

  function endCall() {
    stream.getTracks().forEach((tr) => tr.stop());
    onEnd();
  }

  return (
    <div className="space-y-4">
      <ConnectionBanner state={state} />
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {role === "signer" ? (
        <SignerView
          stream={stream}
          onCommit={(word) => {
            setSent((prev) => [...prev, word].slice(-12));
            sendCaption({ kind: "sign", text: word, final: true });
          }}
          incoming={incoming}
          sent={sent}
          remoteStream={remoteStream}
          onSendMessage={onSendMessage}
        />
      ) : (
        <SpeakerView
          localStream={stream}
          remoteStream={remoteStream}
          locale={locale}
          onSpeech={(text, isFinal) => {
            sendCaption({ kind: "speech", text, final: isFinal });
            if (isFinal) setSent((prev) => [...prev, text].slice(-8));
          }}
          incoming={incoming}
          onPlayIncoming={() => incoming && say(incoming.text)}
          sent={sent}
          onSendMessage={onSendMessage}
        />
      )}

      <div className="grid gap-3 sm:flex sm:justify-center">
        <Button variant="outline" onClick={toggleMic}>
          {micOn ? (
            <Icons.micOn className="size-5" aria-hidden />
          ) : (
            <Icons.micOff className="size-5" aria-hidden />
          )}
          {micOn ? t("muteMic") : t("unmuteMic")}
        </Button>
        <Button variant="destructive" onClick={endCall}>
          <Icons.endCall className="size-5" aria-hidden />
          {t("endCall")}
        </Button>
      </div>
    </div>
  );
}

function ConnectionBanner({ state }: { state: CallState }) {
  const t = useTranslations("app.call");
  const map: Record<CallState, { label: string; tone: string; pulse?: boolean }> = {
    idle: { label: t("waiting"), tone: "text-muted-foreground", pulse: true },
    connecting: { label: t("connecting"), tone: "text-amber-600", pulse: true },
    connected: { label: t("connected"), tone: "text-primary" },
    failed: { label: t("failed"), tone: "text-destructive" },
    closed: { label: t("ended"), tone: "text-muted-foreground" },
  };
  const s = map[state];
  return (
    <p className={`inline-flex items-center gap-2 text-sm font-semibold ${s.tone}`}>
      {(s.pulse || state === "connected") && (
        <span className="size-2 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {s.label}
    </p>
  );
}

// ---- Signer (deaf) view ----------------------------------------------------

function SignerView({
  stream,
  onCommit,
  incoming,
  sent,
  remoteStream,
  onSendMessage,
}: {
  stream: MediaStream;
  onCommit: (word: string) => void;
  incoming: { text: string; interim: boolean } | null;
  sent: string[];
  remoteStream: MediaStream | null;
  onSendMessage?: (text: string) => void;
}) {
  const t = useTranslations("app.call");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState<Candidate | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const { handCount } = useSignRecognition({
    videoRef,
    canvasRef,
    enabled: true,
    onLive: (top) => setLive(top),
    onCommit,
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
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
          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {handCount > 0 && live ? live.text : t("raiseHand")}
          </div>
        </div>
      </Card>

      <VideoTile stream={remoteStream} label={t("speaker")} />

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Father's speech, large, for the child to read */}
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("theirSpeech")}</p>
          <p
            className={`mt-1 text-xl font-extrabold leading-snug sm:text-2xl ${incoming?.interim ? "opacity-60" : ""}`}
          >
            {incoming?.text || "—"}
          </p>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("yourSigns")}</p>
          <div className="min-h-12 rounded-lg bg-secondary/60 p-3 text-lg font-semibold">
            {sent.length ? sent.join(" ") : "—"}
          </div>
        </div>

        {/* Pushes the current sentence into the persistent chat thread with
            this contact. */}
        <Button
          variant="secondary"
          onClick={() => onSendMessage?.(sent.join(" "))}
          disabled={!onSendMessage || sent.length === 0}
        >
          <Icons.chat className="size-5" aria-hidden />
          {t("sendMessage")}
        </Button>
      </Card>
    </div>
  );
}

// ---- Speaker (hearing) view ------------------------------------------------

function SpeakerView({
  localStream,
  remoteStream,
  locale,
  onSpeech,
  incoming,
  onPlayIncoming,
  sent,
  onSendMessage,
}: {
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  locale: "th" | "en";
  onSpeech: (text: string, isFinal: boolean) => void;
  incoming: { text: string; interim: boolean } | null;
  onPlayIncoming: () => void;
  sent: string[];
  onSendMessage?: (text: string) => void;
}) {
  const t = useTranslations("app.call");
  const { supported } = useSpeechRecognition({
    enabled: true,
    lang: locale === "th" ? "th-TH" : "en-US",
    onResult: onSpeech,
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <VideoTile stream={remoteStream} label={t("signer")} />
      <VideoTile stream={localStream} label={t("speaker")} muted mirror />

      {/* Child's signs, large, read aloud automatically */}
      <Card className="border-2 border-primary/30 bg-primary/5 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{t("theirSigns")}</p>
          {incoming && (
            <Button variant="ghost" size="sm" onClick={onPlayIncoming} aria-label={t("play")}>
              <Icons.playAudio className="size-5" aria-hidden />
            </Button>
          )}
        </div>
        <p className="mt-2 text-2xl font-extrabold leading-snug sm:text-3xl">
          {incoming?.text || t("raiseHand")}
        </p>
      </Card>

      <Card className="p-4 sm:p-5">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Icons.micOn className="size-4" aria-hidden />
          {t("listening")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t("speakNow")}</p>
        {!supported && (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {t("sttUnsupported")}
          </p>
        )}
      </Card>

      {/* Pushes the current sentence into the persistent chat thread with
          this contact. */}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => onSendMessage?.(sent.join(" "))}
        disabled={!onSendMessage || sent.length === 0}
      >
        <Icons.chat className="size-5" aria-hidden />
        {t("sendMessage")}
      </Button>
    </div>
  );
}

function VideoTile({
  stream,
  label,
  muted = true,
  mirror = false,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirror?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => {});
  }, [stream]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative aspect-video w-full bg-black">
        {stream ? (
          <video
            ref={videoRef}
            playsInline
            muted={muted}
            className={`absolute inset-0 size-full object-cover ${mirror ? "-scale-x-100" : ""}`}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-white/75">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-current" aria-hidden />
              {label}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          {label}
        </div>
      </div>
    </Card>
  );
}
