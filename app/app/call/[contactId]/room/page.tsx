"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { CallRoom, type CallRole } from "@/components/app/call/call-room";
import { directCallRoomId } from "@/lib/call/room-id";
import { getOrCreateConversation, notifyIncomingCall, sendMessage } from "@/app/app/contacts-actions";

export default function CallRoomPage() {
  const t = useTranslations("app.call");
  const router = useRouter();
  const params = useParams<{ contactId: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const role: CallRole = searchParams.get("role") === "speaker" ? "speaker" : "signer";
  const roomOverride = searchParams.get("room");

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [peerId] = useState(() => Math.random().toString(36).slice(2, 10));

  const userId = session?.user?.id;
  const room = userId ? roomOverride ?? directCallRoomId(userId, params.contactId) : null;

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t("mediaDenied"));
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      setStream(media);
    } catch {
      setError(t("mediaDenied"));
    }
  }, [t]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    void getOrCreateConversation(params.contactId).then((c) => setConversationId(c.id));
  }, [params.contactId]);

  // Only the initiating side (no ?room override) pings the callee.
  useEffect(() => {
    if (stream && userId && !roomOverride) {
      void notifyIncomingCall(params.contactId, directCallRoomId(userId, params.contactId));
    }
  }, [stream, userId, roomOverride, params.contactId]);

  function endCall() {
    stream?.getTracks().forEach((tr) => tr.stop());
    router.push(`/app/call/${params.contactId}`);
  }

  if (!userId || !room) return null;

  if (error) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <p className="text-sm font-medium text-destructive">{error}</p>
      </Card>
    );
  }

  if (!stream) {
    return <p className="text-center text-sm text-muted-foreground">{t("connecting")}</p>;
  }

  return (
    <CallRoom
      room={room}
      peerId={peerId}
      role={role}
      stream={stream}
      onEnd={endCall}
      onSendMessage={conversationId ? (text) => void sendMessage(conversationId, text) : undefined}
    />
  );
}
