export const SUPPORTED_LOCALES = ["zh", "en", "ja", "ko", "vi", "th"] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = "zh"

export const LOCALE_COOKIE = "rune-abyss-locale"

/** <html lang=""> */
export const HTML_LANG: Record<AppLocale, string> = {
  zh: "zh-CN",
  en: "en",
  ja: "ja",
  ko: "ko",
  vi: "vi",
  th: "th",
}

export function isAppLocale(v: string): v is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(v)
}
