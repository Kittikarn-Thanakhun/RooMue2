import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addClient, removeClient, broadcast } from "@/lib/call/signaling-store";

export const dynamic = "force-dynamic";

/**
 * SSE stream of signaling messages for one peer in a room. The peer announces
 * itself via the `peerId` query param. On connect we tell this peer about any
 * peers already present, and notify existing peers that it joined.
 */
export async function GET(
  req: Request,
  { params }: { params: { room: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const peerId = url.searchParams.get("peerId");
  if (!peerId) return new Response("peerId required", { status: 400 });

  const room = params.room;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      const others = addClient(room, { id: peerId, send });
      // Tell this peer who is already here.
      send(JSON.stringify({ type: "peers", peers: others }));
      // Tell the others that this peer joined.
      broadcast(room, peerId, { type: "peer-join", id: peerId });

      // Heartbeat so proxies don't drop the idle connection.
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 20000);

      const close = () => {
        clearInterval(ping);
        removeClient(room, peerId);
        broadcast(room, peerId, { type: "peer-leave", id: peerId });
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
