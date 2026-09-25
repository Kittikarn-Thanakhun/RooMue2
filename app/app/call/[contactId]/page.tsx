import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateConversation, listMessages } from "@/app/app/contacts-actions";
import { ChatThread } from "@/components/app/call/chat-thread";

export const dynamic = "force-dynamic";

export default async function ChatThreadPage({
  params,
}: {
  params: { contactId: string };
}) {
  const session = await getServerSession(authOptions);
  const currentUserId = session!.user.id;

  if (params.contactId === currentUserId) notFound();

  const contact = await prisma.user.findUnique({
    where: { id: params.contactId },
    select: { id: true, firstName: true, lastName: true, image: true },
  });
  if (!contact) notFound();

  const { id: conversationId } = await getOrCreateConversation(params.contactId);
  const { messages } = await listMessages(conversationId);

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—";

  return (
    <ChatThread
      conversationId={conversationId}
      contactUserId={contact.id}
      contactName={name}
      contactImage={contact.image}
      currentUserId={currentUserId}
      initialMessages={messages}
    />
  );
}
