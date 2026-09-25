import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { LanguageToggle } from "@/components/language-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/** Show only the last 4 digits of the national ID. */
function maskNationalId(id: string | null): string | null {
  if (!id) return null;
  return `${"•".repeat(Math.max(0, id.length - 4))}${id.slice(-4)}`;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("app.profile");
  const tApp = await getTranslations("app");

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
  });

  const rows: { label: string; value: string }[] = [
    { label: t("firstName"), value: user?.firstName || t("none") },
    { label: t("lastName"), value: user?.lastName || t("none") },
    { label: t("phone"), value: user?.phone ? formatPhone(user.phone) : t("none") },
    { label: t("nationalId"), value: maskNationalId(user?.nationalId ?? null) || t("none") },
    { label: t("disabilityCard"), value: user?.disabilityCardNo || t("none") },
  ];

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icons.profile className="size-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-extrabold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
              (user?.phone ? formatPhone(user.phone) : null)}
          </p>
        </div>
      </div>

      <Card className="divide-y">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 p-4">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="font-medium">{r.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 p-4">
          <span className="text-sm text-muted-foreground">{t("language")}</span>
          <LanguageToggle />
        </div>
      </Card>

      <SignOutButton label={tApp("signOut")} className="mt-4 w-full" />
    </div>
  );
}
