"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

/**
 * Persists the chosen UI language in a cookie and revalidates the whole tree
 * so server components re-render with the new locale's messages.
 */
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;

  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
