"use client"

import { useRouter } from "next/navigation"
import { Swords } from "lucide-react"

import { MaterialIcon } from "@/components/game/material-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { synthesisProgress, type MaterialKey, type RarityLevel } from "@/lib/game-data"

export function HubNewbieMaterialHint() {
  const router = useRouter()
  const { messages: m } = useLocale()
  const h = m.hub
  const { inventory, setMarketMaterialFilter } = useGame()

  const prog = synthesisProgress(inventory, 1 as RarityLevel)
  const needsMr = prog.missing.MR > 0
  const needsEs = prog.missing.ES > 0
  if (!needsMr && !needsEs) return null

  const goMarket = (mat: MaterialKey) => {
    setMarketMaterialFilter(mat)
    router.push("/game/market")
  }

  return (
    <Card className="border-chart-4/30 bg-gradient-to-br from-chart-4/10 via-card/60 to-card/40 lg:col-span-3">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-chart-4">{h.newbieHintEyebrow}</p>
          <h3 className="font-serif text-lg">{h.newbieHintTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{h.newbieHintBody}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {needsMr ? (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => goMarket("MR")}>
              <MaterialIcon material="MR" size="sm" />
              {h.goMarketMr}
            </Button>
          ) : null}
          {needsEs ? (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => goMarket("ES")}>
              <MaterialIcon material="ES" size="sm" />
              {h.goMarketEs}
            </Button>
          ) : null}
          <Button size="sm" className="gap-1" onClick={() => router.push("/game/dungeons")}>
            <Swords className="size-3.5" aria-hidden />
            {h.goDungeonsSpecialist}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
