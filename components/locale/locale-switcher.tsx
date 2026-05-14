"use client"

import { Check, Languages } from "lucide-react"

import { useLocale } from "@/components/providers/locale-provider"
import { SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n/config"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function LocaleSwitcher({
  className,
  variant = "outline",
  size = "sm",
}: {
  className?: string
  variant?: "outline" | "ghost"
  size?: "sm" | "default" | "icon"
}) {
  const { locale, setLocale, messages } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("gap-1.5 font-normal", className)}
          aria-label={messages.common.languageSwitcher}
        >
          <Languages className="size-4 shrink-0 opacity-80" aria-hidden />
          <span className="hidden sm:inline">{messages.common.languages[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {SUPPORTED_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLocale(code as AppLocale)}
            className="gap-2"
          >
            {locale === code ? (
              <Check className="size-4 text-primary" aria-hidden />
            ) : (
              <span className="inline-block size-4" aria-hidden />
            )}
            {messages.common.languages[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
