"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSignaling, sendSignal, type SignalMessage } from "./use-signaling";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export type CallState = "idle" | "connecting" | "connected" | "failed" | "closed";

/** A message exchanged over the captions data channel. */
export type CaptionMessage = {
  kind: "sign" | "speech";
  text: string;
  final?: boolean;
};

/**
 * Establishes a 1:1 WebRTC connection inside a room. The first peer already in
 * the room becomes the offerer when a second peer joins. Carries the provided
 * local media tracks plus a "captions" data channel for text.
 */
export function useCall({
  room,
  peerId,
  localStream,
  enabled,
  onCaption,
}: {
  room: string | null;
  peerId: string | null;
  localStream: MediaStream | null;
  enabled: boolean;
  onCaption: (msg: CaptionMessage) => void;
}) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const onCaptionRef = useRef(onCaption);
  useEffect(() => {
    onCaptionRef.current = onCaption;
  }, [onCaption]);

  const wireChannel = useCallback((dc: RTCDataChannel) => {
    dc.onmessage = (e) => {
      try {
        onCaptionRef.current(JSON.parse(e.data));
      } catch {
        /* ignore */
      }
    };
  }, []);

  const ensurePc = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (e) => {
      if (e.candidate && room && peerId) {
        sendSignal(room, peerId, { kind: "ice", candidate: e.candidate.toJSON() });
      }
    };
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setState("connected");
      else if (s === "failed") setState("failed");
      else if (s === "disconnected" || s === "closed") setState("closed");
    };
    pc.ondatachannel = (e) => {
      dcRef.current = e.channel;
      wireChannel(e.channel);
    };

    if (localStream) {
      for (const track of localStream.getTracks()) pc.addTrack(track, localStream);
    }
    pcRef.current = pc;
    return pc;
  }, [room, peerId, localStream, wireChannel]);

  const makeOffer = useCallback(async () => {
    if (!room || !peerId) return;
    const pc = ensurePc();
    const dc = pc.createDataChannel("captions");
    dcRef.current = dc;
    wireChannel(dc);
    setState("connecting");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(room, peerId, { kind: "sdp", sdp: pc.localDescription });
  }, [ensurePc, wireChannel, room, peerId]);

  const handle = useCallback(
    async (msg: SignalMessage) => {
      if (!room || !peerId) return;
      if (msg.type === "peer-join") {
        // We were here first → we initiate.
        await makeOffer();
        return;
      }
      if (msg.type === "peer-leave") {
        setState("closed");
        setRemoteStream(null);
        return;
      }
      if (msg.type === "signal") {
        const pc = ensurePc();
        const p = msg.payload;
        if (p.kind === "sdp") {
          await pc.setRemoteDescription(p.sdp);
          if (p.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(room, peerId, { kind: "sdp", sdp: pc.localDescription });
          }
        } else if (p.kind === "ice") {
          try {
            await pc.addIceCandidate(p.candidate);
          } catch {
            /* candidate before remote description; usually safe to drop */
          }
        }
      }
    },
    [ensurePc, makeOffer, room, peerId]
  );

  useSignaling(room, peerId, enabled, handle);

  const sendCaption = useCallback((msg: CaptionMessage) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") dc.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    return () => {
      try {
        dcRef.current?.close();
        pcRef.current?.close();
      } catch {
        /* noop */
      }
      pcRef.current = null;
      dcRef.current = null;
    };
  }, []);

  return { state, remoteStream, sendCaption };
}
