"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons, type LucideIcon } from "@/components/icons";
import { PresetPhrases } from "./preset-phrases";
import { BasicSigns } from "./basic-signs";

// Both pull in the TensorFlow.js/ONNX recognition models — code-split out of
// the hub's initial bundle since most visits never open camera/alphabet mode.
const CameraTranslate = dynamic(
  () => import("./camera-translate").then((m) => m.CameraTranslate),
  { ssr: false, loading: () => <Icons.spinner className="mx-auto my-16 size-6 animate-spin text-primary" aria-hidden /> }
);
const AlphabetTranslate = dynamic(
  () => import("./alphabet-translate").then((m) => m.AlphabetTranslate),
  { ssr: false, loading: () => <Icons.spinner className="mx-auto my-16 size-6 animate-spin text-primary" aria-hidden /> }
);

type View =
  | "menu"
  | "emergencyMenu"
  | "emergencyPreset"
  | "emergencyCamera"
  | "basicSigns"
  | "alphabet";

function BackBar({ onBack }: { onBack: () => void }) {
  const t = useTranslations("app");
  return (
    <Button variant="ghost" size="sm" className="mb-4 px-2 sm:px-4" onClick={onBack}>
      <Icons.back className="size-5" aria-hidden />
      {t("back")}
    </Button>
  );
}

function MenuCard({
  Icon,
  title,
  desc,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="flex items-center gap-4 border-2 border-primary/20 p-4 transition-all hover:border-primary/50 hover:shadow-md sm:p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-bold">{title}</span>
          <span className="block text-sm text-muted-foreground">{desc}</span>
        </span>
      </Card>
    </button>
  );
}

/** The "hand" bottom-nav tab: consolidates Emergency mode, the 20-word basic
 * signs reference, and A–Z fingerspelling — all orphaned by the dashboard
 * replacing the old context-picker home screen. */
export function SignsHub() {
  const t = useTranslations("app");
  const [view, setView] = useState<View>("menu");

  if (view === "emergencyCamera") {
    return (
      <div>
        <BackBar onBack={() => setView("emergencyMenu")} />
        <CameraTranslate
          mode="emergency"
          contextTag="emergency"
          onClose={() => setView("emergencyMenu")}
        />
      </div>
    );
  }

  if (view === "emergencyPreset") {
    return (
      <div className="mx-auto max-w-2xl">
        <BackBar onBack={() => setView("emergencyMenu")} />
        <h2 className="mb-4 text-xl font-extrabold">{t("preset.title")}</h2>
        <PresetPhrases />
      </div>
    );
  }

  if (view === "emergencyMenu") {
    return (
      <div className="mx-auto max-w-2xl">
        <BackBar onBack={() => setView("menu")} />
        <h2 className="mb-4 text-xl font-extrabold">{t("emergency.submenuTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MenuCard
            Icon={Icons.presetPhrases}
            title={t("emergency.preset")}
            desc={t("emergency.presetDesc")}
            onClick={() => setView("emergencyPreset")}
          />
          <MenuCard
            Icon={Icons.camera}
            title={t("emergency.camera")}
            desc={t("emergency.cameraDesc")}
            onClick={() => setView("emergencyCamera")}
          />
        </div>
      </div>
    );
  }

  if (view === "basicSigns") {
    return (
      <div className="mx-auto max-w-2xl">
        <BackBar onBack={() => setView("menu")} />
        <h2 className="text-xl font-extrabold">{t("basicSigns.title")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("basicSigns.subtitle")}</p>
        <BasicSigns />
      </div>
    );
  }

  if (view === "alphabet") {
    return (
      <div>
        <BackBar onBack={() => setView("menu")} />
        <AlphabetTranslate onClose={() => setView("menu")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-extrabold">{t("signs.title")}</h1>
      <div className="space-y-3">
        <MenuCard
          Icon={Icons.emergency}
          title={t("context.emergencyTitle")}
          desc={t("context.emergencyDesc")}
          onClick={() => setView("emergencyMenu")}
        />
        <MenuCard
          Icon={Icons.presetPhrases}
          title={t("everyday.basics")}
          desc={t("everyday.basicsDesc")}
          onClick={() => setView("basicSigns")}
        />
        <MenuCard
          Icon={Icons.hand}
          title={t("context.alphabetTitle")}
          desc={t("context.alphabetDesc")}
          onClick={() => setView("alphabet")}
        />
      </div>
    </div>
  );
}
