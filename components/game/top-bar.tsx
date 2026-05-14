"use client"

import { Zap } from "lucide-react"

import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { WalletButton } from "@/components/game/wallet-button"
import { Separator } from "@/components/ui/separator"
import { RuneAbyssLogo } from "@/components/brand/rune-abyss-logo"
import { UsdtIcon } from "@/components/brand/usdt-icon"

export function TopBar({ title, description }: { title: string; description?: string }) {
  const { advent, usdt, energy, connected } = useGame()
  const { messages: m } = useLocale()

  return (
    <header className="sticky top-11 z-20 border-b border-border bg-background/80 backdrop-blur md:top-0">
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-base tracking-wide text-glow-gold sm:text-xl lg:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="hidden truncate text-xs text-muted-foreground sm:block sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>

        {connected ? (
          <div className="hidden items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-1.5 lg:flex">
            <div className="flex items-center gap-1.5 text-sm">
              <RuneAbyssLogo size={14} title={null} />
              <span className="font-mono">{advent.toLocaleString()}</span>
              <span className="text-muted-foreground text-xs">ADVENT</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-sm">
              <UsdtIcon size={14} title={null} />
              <span className="font-mono">{usdt.toFixed(2)}</span>
              <span className="text-muted-foreground text-xs">USDT</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5 text-sm">
              <Zap className="size-3.5 text-chart-2" aria-hidden />
              <span className="font-mono">{energy}</span>
              <span className="text-muted-foreground text-xs">{m.common.stamina}</span>
            </div>
          </div>
        ) : null}

        <WalletButton />
      </div>
    </header>
  )
}
