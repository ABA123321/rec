"use client"

import * as React from "react"
import { FlaskConical, Loader2, Skull } from "lucide-react"

import { GrassrootsTokenIcon } from "@/components/brand/grassroots-token-icon"
import { TopBar } from "@/components/game/top-bar"
import { MaterialIcon } from "@/components/game/material-icon"
import { SynthesisAnimationModal } from "@/components/game/synthesis-animation-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useLocale } from "@/components/providers/locale-provider"
import { useGame, type Character } from "@/components/providers/game-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { displayRarity } from "@/lib/i18n/game-display"
import {
  MATERIAL_KEYS,
  RARITY_BY_LEVEL,
  SYNTHESIS_COSTS,
  type MaterialKey,
  type RarityLevel,
} from "@/lib/game-data"

export function DesktopSynthesisPage() {
  const { messages: loc } = useLocale()
  const sy = loc.game.synthesis
  const s = loc.game.shared

  const {
    connected,
    connect,
    advent,
    inventory,
    synthesize,
    isTxPending,
    characters,
  } = useGame()

  const [animLevel, setAnimLevel] = React.useState<RarityLevel | null>(null)
  const [animOpen, setAnimOpen] = React.useState(false)
  const [animResult, setAnimResult] = React.useState<Character | null>(null)
  const charsBeforeSynthRef = React.useRef<number | null>(null)

  const startSynthesis = async (level: RarityLevel) => {
    if (isTxPending) return
    charsBeforeSynthRef.current = characters.length
    setAnimLevel(level)
    const ok = await synthesize(level)
    if (ok) {
      setAnimResult(null)
      setAnimOpen(true)
    }
  }

  React.useEffect(() => {
    if (!animOpen || animResult) return
    const before = charsBeforeSynthRef.current
    if (before == null) return
    if (characters.length > before) {
      setAnimResult(characters[characters.length - 1])
    }
  }, [animOpen, animResult, characters])

  return (
    <>
      <TopBar title={sy.title} description={sy.desc} />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {!connected ? (
          <Empty className="border border-dashed border-border bg-card/40">
            <EmptyHeader>
              <EmptyTitle>{s.pleaseConnect}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={connect}>{s.connectWallet}</Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            <Card className="border-border bg-card/60">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {sy.inventoryTag}
                </p>
                <h2 className="font-serif text-xl">{sy.inventory}</h2>
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {MATERIAL_KEYS.map((k) => (
                    <li
                      key={k}
                      className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3"
                    >
                      <MaterialIcon material={k} showLabel size="sm" />
                      <span className="font-mono text-lg">{inventory[k].toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <GrassrootsTokenIcon size={16} title={null} />
                    <span className="text-muted-foreground">$草根社</span>
                  </div>
                  <span className="font-mono text-lg">{advent.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Synthesis cards */}
            <section>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {sy.forgeTag}
              </p>
              <h2 className="font-serif text-2xl">{sy.forgeTitle}</h2>

              <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {SYNTHESIS_COSTS.map((cost) => {
                  const rarity = RARITY_BY_LEVEL[cost.level as RarityLevel]
                  const rv = displayRarity(loc.game, cost.level)
                  const lacking: string[] = []
                  for (const k of MATERIAL_KEYS) {
                    if (inventory[k] < cost[k]) lacking.push(k)
                  }
                  const adventOk = advent >= cost.advent
                  const canCraft = lacking.length === 0 && adventOk

                  const tone = rarity.tone
                  const toneText: Record<1 | 2 | 3 | 4 | 5, string> = {
                    1: "text-chart-1",
                    2: "text-chart-2",
                    3: "text-chart-3",
                    4: "text-chart-4",
                    5: "text-chart-5",
                  }
                  const toneBorder: Record<1 | 2 | 3 | 4 | 5, string> = {
                    1: "border-chart-1/40",
                    2: "border-chart-2/40",
                    3: "border-chart-3/50",
                    4: "border-chart-4/60",
                    5: "border-chart-5/70",
                  }

                  const buttonDisabled = !canCraft || isTxPending

                  return (
                    <li key={cost.level}>
                      <Card className={`h-full border bg-card/60 ${toneBorder[tone]}`}>
                        <CardContent className="flex h-full flex-col gap-4 p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-mono text-xs ${toneText[tone]}`}>
                                Lv.{cost.level} ·{" "}
                                {interpolate(sy.naturalProb, {
                                  pct: (rarity.prob * 100).toFixed(0),
                                })}
                              </p>
                              <h3 className="font-serif text-lg">{rv.name}</h3>
                              <p className="text-[11px] text-muted-foreground">
                                {interpolate(s.powerRange, {
                                  min: String(rarity.powerMin),
                                  max: String(rarity.powerMax),
                                })}
                              </p>
                            </div>
                            <span
                              className={`flex size-12 items-center justify-center rounded-lg border bg-background/60 ${toneBorder[tone]} ${toneText[tone]}`}
                              aria-hidden
                            >
                              <FlaskConical className="size-6" />
                            </span>
                          </div>

                          <ul className="grid grid-cols-2 gap-2">
                            {(MATERIAL_KEYS).map((k) => {
                              const need = cost[k as MaterialKey]
                              const have = inventory[k]
                              const ok = have >= need
                              return (
                                <li
                                  key={k}
                                  className={`flex items-center justify-between rounded-lg border p-2 ${
                                    ok ? "border-border bg-background/40" : "border-destructive/40 bg-destructive/5"
                                  }`}
                                >
                                  <MaterialIcon material={k} size="sm" />
                                  <div className="text-right">
                                    <div className={`font-mono text-sm ${ok ? "" : "text-destructive"}`}>
                                      {have} / {need}
                                    </div>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>

                          <div
                            className={`flex items-center justify-between rounded-lg border p-2 ${
                              adventOk
                                ? "border-border bg-background/40"
                                : "border-destructive/40 bg-destructive/5"
                            }`}
                          >
                            <span className="flex items-center gap-2 text-sm">
                              <GrassrootsTokenIcon size={14} title={null} />
                              <span className="text-muted-foreground">{sy.adventBurn}</span>
                            </span>
                            <span
                              className={`font-mono text-sm ${adventOk ? "" : "text-destructive"}`}
                            >
                              {advent.toLocaleString()} / {cost.advent.toLocaleString()}
                            </span>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Skull className="size-3" aria-hidden />
                              {sy.toVoid}
                            </span>
                            <Button
                              disabled={buttonDisabled}
                              onClick={() => startSynthesis(cost.level as RarityLevel)}
                              className="gap-2"
                            >
                              {isTxPending ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden />
                              ) : (
                                <FlaskConical className="size-4" aria-hidden />
                              )}
                              {isTxPending ? s.submitting : sy.submit}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>

              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                合成在单笔交易中即时完成，结果由链上伪随机数决定。
              </p>
            </section>
          </div>
        )}
      </main>

      {/* 合成动画 */}
      <SynthesisAnimationModal
        open={animOpen}
        level={animLevel}
        newCharacter={animResult}
        onClose={() => {
          setAnimOpen(false)
          setAnimLevel(null)
          setAnimResult(null)
          charsBeforeSynthRef.current = null
        }}
      />
    </>
  )
}
