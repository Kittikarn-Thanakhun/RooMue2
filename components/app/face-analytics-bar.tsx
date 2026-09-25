"use client";

import { useTranslations } from "next-intl";
import { Icons, type LucideIcon } from "@/components/icons";

export type FaceSignals = {
  smile: number;
  eyesOpen: number;
  mouthOpen: number;
};

function Metric({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: number;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Icon className="size-4 text-primary" aria-hidden />
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function FaceAnalyticsBar({ signals }: { signals: FaceSignals }) {
  const t = useTranslations("app.camera");
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold">{t("faceAnalytics")}</h3>
      <Metric Icon={Icons.smile} label={t("smile")} value={signals.smile} />
      <Metric Icon={Icons.eyeOpen} label={t("eyes")} value={signals.eyesOpen} />
      <Metric Icon={Icons.mouth} label={t("mouth")} value={signals.mouthOpen} />
    </div>
  );
}
