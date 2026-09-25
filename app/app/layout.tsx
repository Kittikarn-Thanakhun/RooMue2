import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { AppNav } from "@/components/app/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { A11yProvider } from "@/components/accessibility/a11y-provider";
import { A11yMenu } from "@/components/accessibility/a11y-menu";
import { Icons } from "@/components/icons";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const t = await getTranslations("app");

  const displayName = session.user.name ?? t("greeting");

  return (
    <A11yProvider>
      <div className="flex min-h-dvh flex-col bg-secondary/20">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t("skipToContent")}
        </a>
        <header className="border-b bg-background">
          <div className="container flex min-h-16 items-center justify-between gap-3 py-3">
            <Link href="/app" className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icons.hand className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-base font-extrabold tracking-tight">Roo_mue</span>
                <span className="block truncate text-xs text-muted-foreground">{displayName}</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <A11yMenu />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main-content" className="container flex-1 py-5 pb-28 sm:py-8 sm:pb-28">
          {children}
        </main>
        <AppNav />
      </div>
    </A11yProvider>
  );
}
