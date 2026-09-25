import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addClient, removeClient } from "@/lib/call/signaling-store";

export const dynamic = "force-dynamic";

/**
 * SSE stream of live chat events (new messages, incoming-call pings) for one
 * conversation. Reuses the same in-memory relay as WebRTC signaling
 * (lib/call/signaling-store.ts) under a `chat:{conversationId}` key — writes
 * happen via the sendMessage/notifyIncomingCall server actions, which call
 * broadcast() directly, so there is no separate POST endpoint here.
 *
 * Unlike the call-signaling route (which trusts room-code obscurity), chat
 * content is real and must be authorized: only conversation participants may
 * subscribe.
 */
export async function GET(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
  });
  if (!conversation) return new Response("not_found", { status: 404 });
  if (conversation.userAId !== session.user.id && conversation.userBId !== session.user.id) {
    return new Response("forbidden", { status: 403 });
  }

  const channel = `chat:${params.conversationId}`;
  // A fresh id per SSE connection (not the raw userId) — otherwise a second
  // tab from the same user would silently evict the first tab's connection
  // from the shared Map, since addClient keys by this id.
  const connectionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      addClient(channel, { id: connectionId, send });

      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 20000);

      const close = () => {
        clearInterval(ping);
        removeClient(channel, connectionId);
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
