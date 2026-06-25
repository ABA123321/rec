"use client"

import { Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatBonusPct, teamClassBonusBps } from "@/lib/class-affinity"
import type { Character } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"

export function ClassAffinityBadge({
  members,
  dungeonLevel,
}: {
  members: Character[]
  dungeonLevel: number
}) {
  const { messages: loc } = useLocale()
  const bps = teamClassBonusBps(members, dungeonLevel)
  if (bps <= 0) return null
  const pct = formatBonusPct(bps)
  return (
    <Badge variant="outline" className="gap-1 border-chart-1/40 bg-chart-1/10 text-chart-1">
      <Sparkles className="size-3" aria-hidden />
      {interpolate(loc.game.dungeons.affinityBonus, { pct })}
    </Badge>
  )
}
