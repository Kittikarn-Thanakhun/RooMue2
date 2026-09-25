"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { RoleSelectModal } from "./role-select-modal";
import { sendMessage, type ChatMessageDTO } from "@/app/app/contacts-actions";
import { cn } from "@/lib/utils";
import type { CallRole } from "./call-room";

function Avatar({ image }: { image: string | null }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        <Icons.profile className="size-4" aria-hidden />
      )}
    </span>
  );
}

type ChatEvent =
  | { type: "message"; message: ChatMessageDTO }
  | { type: "incoming-call"; room: string; fromUserId: string };

export function ChatThread({
  conversationId,
  contactUserId,
  contactName,
  contactImage,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  contactUserId: string;
  contactName: string;
  contactImage: string | null;
  currentUserId: string;
  initialMessages: ChatMessageDTO[];
}) {
  const t = useTranslations("app.chat");
  const tCall = useTranslations("app.call");
  const router = useRouter();

  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ room: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/chat/${conversationId}/events`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as ChatEvent;
      if (data.type === "message") {
        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      } else if (data.type === "incoming-call") {
        setIncomingCall({ room: data.room });
      }
    };
    return () => es.close();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await sendMessage(conversationId, text);
    if (res.message) {
      const msg = res.message;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }
  }

  function selectRole(role: CallRole) {
    setRoleModalOpen(false);
    router.push(`/app/call/${contactUserId}/room?role=${role}`);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-14rem)] max-w-2xl flex-col">
      <div className="flex items-center gap-3 border-b pb-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/app/call")} aria-label={t("back")}>
          <Icons.back className="size-5" aria-hidden />
        </Button>
        <Avatar image={contactImage} />
        <span className="min-w-0 flex-1 truncate font-bold">{contactName}</span>
        <Button
          size="icon"
          shape="pill"
          onClick={() => setRoleModalOpen(true)}
          aria-label={tCall("start")}
        >
          <Icons.call className="size-5" aria-hidden />
        </Button>
      </div>

      {incomingCall && (
        <button
          type="button"
          onClick={() =>
            router.push(`/app/call/${contactUserId}/room?room=${incomingCall.room}&role=speaker`)
          }
          className="my-2 flex items-center justify-between rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
        >
          {t("incomingCall", { name: contactName })}
          <Icons.call className="size-4" aria-hidden />
        </button>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.senderId === currentUserId ? "justify-end" : "justify-start")}>
            <span
              className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                m.senderId === currentUserId
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-secondary"
              )}
            >
              {m.body}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder={t("placeholder")}
          className="h-11 flex-1 rounded-full border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button size="icon" shape="pill" onClick={send} aria-label={t("send")} disabled={!draft.trim()}>
          <Icons.send className="size-5" aria-hidden />
        </Button>
      </div>

      {roleModalOpen && (
        <RoleSelectModal onClose={() => setRoleModalOpen(false)} onSelect={selectRole} />
      )}
    </div>
  );
}
