import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale } from "./config";

/**
 * next-intl is configured WITHOUT i18n routing: there are no `/th` or `/en`
 * URL prefixes. The active language is read from the NEXT_LOCALE cookie so the
 * toggle applies globally to every page. Defaults to Thai.
 */
export default getRequestConfig(async () => {
  const cookieLocale = cookies().get("NEXT_LOCALE")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
