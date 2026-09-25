"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { broadcast } from "@/lib/call/signaling-store";
import { rateLimit } from "@/lib/rate-limit";

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

function chatChannel(conversationId: string) {
  return `chat:${conversationId}`;
}

function displayName(u: { firstName: string | null; lastName: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
}

export type PublicUser = { id: string; firstName: string | null; lastName: string | null; image: string | null };
export type FindUserResult =
  | { status: "found"; user: PublicUser; alreadyAdded: boolean }
  | { status: "not_found" }
  | { status: "self" }
  | { status: "invalid_phone" }
  | { status: "rate_limited" };

/** Exact-match phone lookup for "add contact". Returns only display-safe
 * fields — never phone/email/nationalId. Intentionally exact-match only (no
 * partial/fuzzy search) so this can't be used as a general user directory. */
export async function findUserByPhone(phoneInput: string): Promise<FindUserResult> {
  const userId = await requireUserId();
  // Caps how many numbers one account can probe — without this, findUserByPhone
  // would let a logged-in user script a phone-number enumeration scan.
  if (!rateLimit(`find-user:${userId}`, 20, 10 * 60 * 1000)) {
    return { status: "rate_limited" };
  }
  const phone = normalizePhone(phoneInput);
  if (!phone) return { status: "invalid_phone" };

  const found = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, firstName: true, lastName: true, image: true },
  });
  if (!found) return { status: "not_found" };
  if (found.id === userId) return { status: "self" };

  const existing = await prisma.contact.findUnique({
    where: { ownerId_contactUserId: { ownerId: userId, contactUserId: found.id } },
  });
  return { status: "found", user: found, alreadyAdded: Boolean(existing) };
}

export async function addContact(contactUserId: string, label?: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (contactUserId === userId) return { ok: false };

  await prisma.contact.upsert({
    where: { ownerId_contactUserId: { ownerId: userId, contactUserId } },
    update: { label: label ?? undefined },
    create: { ownerId: userId, contactUserId, label },
  });

  revalidatePath("/app/call");
  return { ok: true };
}

export type ContactListItem = {
  id: string;
  userId: string;
  name: string;
  image: string | null;
  lastActivityAt: string; // ISO
  conversationId: string | null;
};

export async function listContacts(): Promise<ContactListItem[]> {
  const userId = await requireUserId();

  const [contacts, conversations] = await Promise.all([
    prisma.contact.findMany({
      where: { ownerId: userId },
      include: { contactUser: { select: { id: true, firstName: true, lastName: true, image: true } } },
    }),
    prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
    }),
  ]);

  const conversationByOtherUser = new Map(
    conversations.map((c) => [c.userAId === userId ? c.userBId : c.userAId, c])
  );

  return contacts
    .map((c) => {
      const conv = conversationByOtherUser.get(c.contactUserId);
      return {
        id: c.id,
        userId: c.contactUserId,
        name: c.label || displayName(c.contactUser),
        image: c.contactUser.image,
        lastActivityAt: (conv?.updatedAt ?? c.createdAt).toISOString(),
        conversationId: conv?.id ?? null,
      };
    })
    .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1));
}

/** The single choke point that sorts the pair before upsert, so the unique
 * constraint dedupes a Conversation regardless of who initiates. */
export async function getOrCreateConversation(otherUserId: string): Promise<{ id: string }> {
  const userId = await requireUserId();
  if (otherUserId === userId) throw new Error("cannot_message_self");

  const [userAId, userBId] = [userId, otherUserId].sort();
  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });
  return { id: conversation.id };
}

export type ChatMessageDTO = { id: string; senderId: string; body: string; createdAt: string };

async function requireParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (conversation.userAId !== userId && conversation.userBId !== userId) return null;
  return conversation;
}

export async function sendMessage(
  conversationId: string,
  body: string
): Promise<{ ok: boolean; message?: ChatMessageDTO }> {
  const userId = await requireUserId();
  const text = body.trim();
  if (!text) return { ok: false };

  // Generous enough for real conversation, tight enough to block flood-spam.
  if (!rateLimit(`send-message:${userId}`, 30, 60 * 1000)) return { ok: false };

  const conversation = await requireParticipant(conversationId, userId);
  if (!conversation) return { ok: false };

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { conversationId, senderId: userId, body: text },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: {} }),
  ]);

  const dto: ChatMessageDTO = {
    id: message.id,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };

  broadcast(chatChannel(conversationId), userId, { type: "message", message: dto });

  return { ok: true, message: dto };
}

export async function listMessages(
  conversationId: string,
  cursor?: string,
  take = 30
): Promise<{ messages: ChatMessageDTO[]; nextCursor: string | null }> {
  const userId = await requireUserId();
  const conversation = await requireParticipant(conversationId, userId);
  if (!conversation) return { messages: [], nextCursor: null };

  const rows = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    messages: page
      .map((r) => ({
        id: r.id,
        senderId: r.senderId,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      }))
      .reverse(), // chronological order for rendering
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/** Fire-and-forget push so a callee who currently has this contact's chat
 * thread open sees an "incoming call" banner. Does NOT reach a callee who
 * isn't already on that screen — no push/service-worker infra exists. */
export async function notifyIncomingCall(otherUserId: string, room: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const { id: conversationId } = await getOrCreateConversation(otherUserId);
  broadcast(chatChannel(conversationId), userId, { type: "incoming-call", room, fromUserId: userId });
  return { ok: true };
}
