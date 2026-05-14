import type { AppLocale } from "@/lib/i18n/config"
import { en } from "./en"
import type { Messages } from "./zh"
import { zh } from "./zh"
import { ja } from "./ja"
import { ko } from "./ko"
import { vi } from "./vi"
import { th } from "./th"

export const dictionaries: Record<AppLocale, Messages> = {
  zh,
  en,
  ja,
  ko,
  vi,
  th,
}

export function getMessages(locale: AppLocale): Messages {
  return dictionaries[locale] ?? zh
}
