"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Icons, type LucideIcon } from "@/components/icons";
import { CallRoom, type CallRole } from "./call-room";
import { cn } from "@/lib/utils";

function randomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function CallScreen() {
  const t = useTranslations("app.call");

  const [role, setRole] = useState<CallRole | null>(null);
  const [roomMode, setRoomMode] = useState<"create" | "join">("create");
  const [createdCode] = useState(() => randomCode());
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [peerId] = useState(() => randomId());

  async function startCall() {
    setError(null);
    if (!role) return;
    const code = (roomMode === "create" ? createdCode : joinCode).trim().toUpperCase();
    if (!code) return setError(t("roomCodePlaceholder"));

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(typeof window !== "undefined" && !window.isSecureContext ? t("insecure") : t("mediaDenied"));
      return;
    }

    setBusy(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: true,
      });
      setStream(media);
      setRoom(code);
    } catch {
      setError(t("mediaDenied"));
    } finally {
      setBusy(false);
    }
  }

  function endCall() {
    setStream(null);
    setRoom(null);
  }

  if (stream && room && role) {
    return (
      <div className="mx-auto max-w-4xl">
        <CallRoom room={room} peerId={peerId} role={role} stream={stream} onEnd={endCall} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Role */}
      <p className="mb-2 text-sm font-semibold text-muted-foreground">{t("chooseRole")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <RoleCard
          Icon={Icons.hand}
          title={t("signer")}
          hint={t("signerHint")}
          active={role === "signer"}
          onClick={() => setRole("signer")}
        />
        <RoleCard
          Icon={Icons.micOn}
          title={t("speaker")}
          hint={t("speakerHint")}
          active={role === "speaker"}
          onClick={() => setRole("speaker")}
        />
      </div>

      {/* Room */}
      <Card className="mt-5 p-4 sm:p-5">
        <div className="mb-4 grid grid-cols-2 rounded-lg border p-1 sm:inline-flex">
          <TabBtn active={roomMode === "create"} onClick={() => setRoomMode("create")}>
            {t("createRoom")}
          </TabBtn>
          <TabBtn active={roomMode === "join"} onClick={() => setRoomMode("join")}>
            {t("joinRoom")}
          </TabBtn>
        </div>

        {roomMode === "create" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("shareHint")}</p>
            <div className="grid gap-2 sm:flex sm:items-center">
              <span className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-3 text-center font-mono text-xl font-bold tracking-[0.2em] sm:px-4 sm:text-2xl sm:tracking-[0.3em]">
                {createdCode}
              </span>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(createdCode).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                <Icons.copy className="size-5" aria-hidden />
                {copied ? t("copied") : t("copy")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="joinCode" className="text-sm font-medium">
              {t("roomCode")}
            </label>
            <Input
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t("roomCodePlaceholder")}
              className="font-mono text-lg tracking-[0.2em]"
              maxLength={8}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="mt-5 w-full"
          onClick={startCall}
          disabled={!role || busy || (roomMode === "join" && !joinCode.trim())}
        >
          <Icons.call className="size-5" aria-hidden />
          {t("start")}
        </Button>
      </Card>
    </div>
  );
}

function RoleCard({
  Icon,
  title,
  hint,
  active,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card
        className={cn(
          "flex h-full items-start gap-3 border-2 p-4 transition-colors",
          active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        )}
      >
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
          )}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <span>
          <span className="block font-bold">{title}</span>
          <span className="block text-sm text-muted-foreground">{hint}</span>
        </span>
      </Card>
    </button>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-md px-3 text-sm font-semibold transition-colors sm:px-4",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}
