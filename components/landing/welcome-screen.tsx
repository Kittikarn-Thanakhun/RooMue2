import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/logo";
import { SignBackdrop } from "@/components/brand/sign-backdrop";

/**
 * Full-bleed deep-blue "welcome" screen — the app's entry point, matching the
 * Figma welcome mockup. Replaces the old marketing Hero/FeatureGrid landing.
 */
export async function WelcomeScreen() {
  const t = await getTranslations("landing.welcome");

  return (
    <div className="bg-brand-gradient relative isolate flex min-h-dvh flex-col overflow-hidden text-white">
      <SignBackdrop tone="white" spread="full" motion="bounce" />

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <BrandMark className="size-20 shadow-xl" />
        <p className="mt-8 text-lg font-medium text-white/85">{t("greeting")}</p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">RooMue</h1>
        <p className="mx-auto mt-4 max-w-xs text-base text-white/85">{t("tagline")}</p>
      </main>

      <div className="mx-auto w-full max-w-sm space-y-4 px-6 pb-12">
        <Link
          href="/register"
          className={buttonVariants({ variant: "onBrand", shape: "pill", size: "lg", className: "w-full" })}
        >
          {t("cta")}
        </Link>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-white/85 underline-offset-4 hover:underline"
        >
          {t("haveAccount")}
        </Link>
      </div>
    </div>
  );
}
