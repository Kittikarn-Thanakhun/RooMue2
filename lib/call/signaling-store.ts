/**
 * In-memory WebRTC signaling relay, keyed by room code.
 *
 * Lives on globalThis so it survives dev HMR and is shared across the SSE and
 * POST route handlers within a single Node process. NOTE: single-instance only
 * — for multi-instance production, replace with Redis pub/sub or similar.
 */

export type SignalClient = {
  id: string;
  send: (data: string) => void;
};

type Room = Map<string, SignalClient>; // peerId -> client

const globalForRooms = globalThis as unknown as {
  __callRooms?: Map<string, Room>;
};

const rooms: Map<string, Room> = (globalForRooms.__callRooms ??= new Map());

function getRoom(room: string): Room {
  let r = rooms.get(room);
  if (!r) {
    r = new Map();
    rooms.set(room, r);
  }
  return r;
}

export function addClient(room: string, client: SignalClient): string[] {
  const r = getRoom(room);
  r.set(client.id, client);
  // Return the ids of the OTHER peers already present.
  return [...r.keys()].filter((id) => id !== client.id);
}

export function removeClient(room: string, peerId: string) {
  const r = rooms.get(room);
  if (!r) return;
  r.delete(peerId);
  if (r.size === 0) rooms.delete(room);
}

/** Send a payload to every peer in the room except the sender. */
export function broadcast(room: string, senderId: string, payload: unknown) {
  const r = rooms.get(room);
  if (!r) return;
  const data = JSON.stringify(payload);
  for (const [id, client] of r) {
    if (id === senderId) continue;
    try {
      client.send(data);
    } catch {
      /* dead stream; will be cleaned up on abort */
    }
  }
}

export function roomSize(room: string): number {
  return rooms.get(room)?.size ?? 0;
}
