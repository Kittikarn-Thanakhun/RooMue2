"use client";

import { useEffect, useRef } from "react";

export type SignalMessage =
  | { type: "peers"; peers: string[] }
  | { type: "peer-join"; id: string }
  | { type: "peer-leave"; id: string }
  | { type: "signal"; from: string; payload: any };

/** Subscribes to the room's SSE stream. Cookies are sent automatically (same-origin). */
export function useSignaling(
  room: string | null,
  peerId: string | null,
  enabled: boolean,
  onMessage: (msg: SignalMessage) => void
) {
  const onRef = useRef(onMessage);
  useEffect(() => {
    onRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !room || !peerId) return;
    const es = new EventSource(
      `/api/call/${encodeURIComponent(room)}/events?peerId=${encodeURIComponent(peerId)}`
    );
    es.onmessage = (e) => {
      try {
        onRef.current(JSON.parse(e.data));
      } catch {
        /* heartbeat / non-JSON */
      }
    };
    return () => es.close();
  }, [room, peerId, enabled]);
}

export async function sendSignal(room: string, peerId: string, payload: unknown) {
  await fetch(`/api/call/${encodeURIComponent(room)}/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ peerId, payload }),
  }).catch(() => {});
}
