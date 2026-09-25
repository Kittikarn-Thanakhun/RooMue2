import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcast } from "@/lib/call/signaling-store";

export const dynamic = "force-dynamic";

/**
 * Relays a signaling message (offer / answer / ICE candidate) to the other
 * peer(s) in the room. Body: { peerId: string, payload: unknown }.
 */
export async function POST(
  req: Request,
  { params }: { params: { room: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { peerId?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.peerId || body.payload === undefined) {
    return NextResponse.json({ error: "peerId and payload required" }, { status: 400 });
  }

  broadcast(params.room, body.peerId, { type: "signal", from: body.peerId, payload: body.payload });
  return NextResponse.json({ ok: true });
}
