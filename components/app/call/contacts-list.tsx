"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import {
  findUserByPhone,
  addContact,
  type ContactListItem,
  type FindUserResult,
} from "@/app/app/contacts-actions";

function Avatar({ image }: { image: string | null }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        <Icons.profile className="size-5" aria-hidden />
      )}
    </span>
  );
}

export function ContactsList({ contacts }: { contacts: ContactListItem[] }) {
  const t = useTranslations("app.contacts");
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("title")}</h1>
        <Button size="sm" shape="pill" onClick={() => setAddOpen(true)}>
          <Icons.addContact className="size-4" aria-hidden />
          {t("add")}
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t("empty")}</Card>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/call/${c.userId}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40"
              >
                <Avatar image={c.image} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                </span>
                <Icons.next className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {addOpen && <AddContactDialog onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddContactDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("app.contacts");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<FindUserResult | null>(null);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);

  async function search() {
    setPending(true);
    setResult(null);
    setAdded(false);
    try {
      setResult(await findUserByPhone(phone));
    } finally {
      setPending(false);
    }
  }

  async function add() {
    if (result?.status !== "found") return;
    await addContact(result.user.id);
    setAdded(true);
  }

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-bold">{t("addTitle")}</h2>
        <div className="flex gap-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="081-234-5678"
            inputMode="tel"
          />
          <Button onClick={search} disabled={pending || !phone.trim()}>
            {t("search")}
          </Button>
        </div>

        {result?.status === "invalid_phone" && (
          <p className="mt-3 text-sm text-destructive">{t("invalidPhone")}</p>
        )}
        {result?.status === "not_found" && (
          <p className="mt-3 text-sm text-muted-foreground">{t("notFound")}</p>
        )}
        {result?.status === "self" && (
          <p className="mt-3 text-sm text-muted-foreground">{t("isSelf")}</p>
        )}
        {result?.status === "rate_limited" && (
          <p className="mt-3 text-sm text-destructive">{t("rateLimited")}</p>
        )}
        {result?.status === "found" && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="flex items-center gap-2 font-semibold">
              <Avatar image={result.user.image} />
              {[result.user.firstName, result.user.lastName].filter(Boolean).join(" ") || "—"}
            </span>
            {result.alreadyAdded || added ? (
              <span className="text-sm font-medium text-primary">{t("added")}</span>
            ) : (
              <Button size="sm" onClick={add}>
                {t("addAction")}
              </Button>
            )}
          </div>
        )}

        <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
          {t("close")}
        </Button>
      </Card>
    </div>
  );
}
