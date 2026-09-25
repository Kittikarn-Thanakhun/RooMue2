import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/brand/logo";
import { SignBackdrop } from "@/components/brand/sign-backdrop";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("common");

  return (
    <div className="bg-brand-gradient relative isolate flex min-h-dvh flex-col">
      <SignBackdrop tone="white" />
      <header className="w-full">
        <div className="container flex min-h-16 items-center justify-between gap-3 py-3">
          <Link
            href="/"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo size="sm" showThai={false} light name={t("appName")} />
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
