"use client";

import { useTranslations } from "next-intl";
import { Icons, type LucideIcon } from "@/components/icons";
import type { CallRole } from "./call-room";

function RoleTile({ Icon, label, onClick }: { Icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-primary p-8 text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
    >
      <Icon className="size-10" aria-hidden />
      <span className="text-lg font-bold">{label}</span>
    </button>
  );
}

/** "ผู้ใช้ภาษามือ / พูดคุย" role-select popup, shown when starting a call
 * with a contact from the chat thread. */
export function RoleSelectModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (role: CallRole) => void;
}) {
  const t = useTranslations("app.call");
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="grid w-full max-w-xs grid-cols-1 gap-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("chooseRole")}
      >
        <RoleTile Icon={Icons.hand} label={t("signer")} onClick={() => onSelect("signer")} />
        <RoleTile Icon={Icons.micOn} label={t("speaker")} onClick={() => onSelect("speaker")} />
      </div>
    </div>
  );
}
