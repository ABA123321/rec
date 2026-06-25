"use client"

import Image from "next/image"
import * as React from "react"

import { cn } from "@/lib/utils"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { displayClass, displayRarity } from "@/lib/i18n/game-display"
import { CLASS_NAMES, normalizeRarityLevel, RARITY_BY_LEVEL } from "@/lib/game-data"
import type { Character } from "@/components/providers/game-provider"

const TONE_BG: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "from-chart-1/30 to-chart-1/5 border-chart-1/30",
  2: "from-chart-2/30 to-chart-2/5 border-chart-2/40",
  3: "from-chart-3/30 to-chart-3/5 border-chart-3/40",
  4: "from-chart-4/40 to-chart-4/5 border-chart-4/50",
  5: "from-chart-5/40 to-chart-5/5 border-chart-5/60",
}

const TONE_TEXT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "text-chart-1",
  2: "text-chart-2",
  3: "text-chart-3",
  4: "text-chart-4",
  5: "text-chart-5",
}

const TONE_GLOW: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "",
  2: "shadow-[0_0_24px_-4px_oklch(0.72_0.13_195/0.4)]",
  3: "shadow-[0_0_24px_-4px_oklch(0.7_0.13_230/0.45)]",
  4: "shadow-[0_0_28px_-4px_oklch(0.8_0.15_80/0.55)] ring-1 ring-chart-4/40",
  5: "shadow-[0_0_36px_-4px_oklch(0.7_0.18_35/0.7)] ring-1 ring-chart-5/60",
}

interface Props {
  character: Character
  selected?: boolean
  selectable?: boolean
  disabled?: boolean
  onSelect?: () => void
  size?: "sm" | "md"
  /** 召唤结果等：仅窄屏收紧留白与字号，md 及以上与未开启 dense 时一致 */
  dense?: boolean
}

export function CharacterCard({
  character,
  selected,
  selectable,
  disabled,
  onSelect,
  size = "md",
  dense = false,
}: Props) {
  const { messages: loc } = useLocale()
  const g = loc.game
  const sh = g.shared
  const r = RARITY_BY_LEVEL[normalizeRarityLevel(character.rarity)]
  const rv = displayRarity(g, character.rarity)
  const className = displayClass(g, character.classIndex % CLASS_NAMES.length)
  const Wrapper: React.ElementType = selectable ? "button" : "div"
  const cardAria = interpolate(sh.characterCardAria, {
    name: rv.name,
    class: className,
    powerLabel: sh.power,
    powerValue: String(character.power),
  })

  return (
    <Wrapper
      type={selectable ? "button" : undefined}
      onClick={selectable && !disabled ? onSelect : undefined}
      disabled={selectable ? disabled : undefined}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border bg-gradient-to-br p-3 text-left transition",
        dense && "max-md:rounded-lg max-md:p-1.5",
        TONE_BG[r.tone],
        TONE_GLOW[r.tone],
        selectable && !disabled && "hover:scale-[1.01] hover:brightness-110 cursor-pointer",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      aria-label={cardAria}
    >
      <div className={cn("flex items-start justify-between gap-2", dense && "max-md:gap-1")}>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-serif uppercase tracking-widest",
            TONE_TEXT[r.tone],
            "border-current/40 bg-background/60 backdrop-blur",
            dense && "max-md:rounded max-md:px-1.5 max-md:py-0 max-md:text-[9px] max-md:tracking-wide",
          )}
        >
          Lv.{r.level} {rv.short}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] text-muted-foreground",
            dense && "max-md:text-[9px]",
          )}
        >
          #{character.id.slice(-4)}
        </span>
      </div>

      <div
        className={cn(
          "relative mt-2 overflow-hidden rounded-lg border border-border/40 bg-background/40",
          size === "sm" ? "aspect-[4/5]" : "aspect-[3/4]",
          dense &&
            size === "sm" &&
            "max-md:mt-1.5 max-md:aspect-[5/6] max-md:rounded-md",
        )}
      >
        <Image
          src={r.image || "/placeholder.svg"}
          alt={interpolate(sh.portraitAlt, { name: rv.name })}
          fill
          sizes={dense ? "(max-width: 768px) 42vw, 240px" : "(max-width: 768px) 50vw, 240px"}
          className="object-cover transition duration-500 group-hover:scale-105"
          priority={r.tone >= 4}
        />
        {/* Bottom gradient for legibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 p-2.5",
            dense && "max-md:p-1.5 max-md:pb-1",
          )}
        >
          <div
            className={cn(
              "text-[10px] uppercase tracking-widest text-muted-foreground",
              dense && "max-md:text-[9px] max-md:tracking-wide",
            )}
          >
            {className}
          </div>
          <div className={cn("flex items-end justify-between gap-2", dense && "max-md:gap-1")}>
            <div
              className={cn(
                "font-serif text-sm leading-tight",
                dense && "max-md:text-xs max-md:leading-snug",
              )}
            >
              {rv.name}
            </div>
            <div
              className={cn(
                "font-mono text-lg font-semibold",
                TONE_TEXT[r.tone],
                dense && "max-md:text-base max-md:tabular-nums",
              )}
            >
              {character.power}
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  )
}
