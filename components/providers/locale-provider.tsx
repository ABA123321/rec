"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  DEFAULT_LOCALE,
  HTML_LANG,
  LOCALE_COOKIE,
  type AppLocale,
  isAppLocale,
} from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/dictionaries/registry"
import type { Messages } from "@/lib/i18n/dictionaries/zh"

type LocaleContextValue = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  messages: Messages
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readCookieLocale(): AppLocale | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  )
  const raw = match?.[1] ? decodeURIComponent(match[1]) : ""
  return isAppLocale(raw) ? raw : null
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE)

  useEffect(() => {
    const fromCookie = readCookieLocale()
    if (fromCookie) setLocaleState(fromCookie)
  }, [])

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale]
  }, [locale])

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(next)};path=/;max-age=31536000;SameSite=Lax`
    document.documentElement.lang = HTML_LANG[next]
  }, [])

  const messages = useMemo(() => getMessages(locale), [locale])

  const value = useMemo(
    () => ({ locale, setLocale, messages }),
    [locale, setLocale, messages],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return ctx
}
