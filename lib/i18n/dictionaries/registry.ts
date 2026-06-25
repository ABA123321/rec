import type { AppLocale } from "@/lib/i18n/config"
import type { Messages } from "./zh"
import { zh } from "./zh"

const localeLoaders: Record<AppLocale, () => Promise<Messages>> = {
  zh: async () => zh,
  en: async () => (await import("./en")).en,
  ja: async () => (await import("./ja")).ja,
  ko: async () => (await import("./ko")).ko,
  vi: async () => (await import("./vi")).vi,
  th: async () => (await import("./th")).th,
}

const cache = new Map<AppLocale, Messages>()
cache.set("zh", zh)

/** 异步加载语言包（非 zh 走独立 chunk） */
export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const hit = cache.get(locale)
  if (hit) return hit
  const loader = localeLoaders[locale] ?? localeLoaders.zh
  const messages = await loader()
  cache.set(locale, messages)
  return messages
}

/** 同步读取已缓存的语言包；未加载时回退 zh */
export function getMessages(locale: AppLocale): Messages {
  return cache.get(locale) ?? zh
}
