"use client"

import * as React from "react"
import {
  CheckCircle2,
  FlaskConical,
  Hourglass,
  Loader2,
  Skull,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { RuneAbyssLogo } from "@/components/brand/rune-abyss-logo"
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
import { Progress } from "@/components/ui/progress"
import { useGame, type Character } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { displayRarity } from "@/lib/i18n/game-display"
import {
  MATERIAL_KEYS,
  RARITY_BY_LEVEL,
  SYNTHESIS_COSTS,
  type MaterialKey,
  type RarityLevel,
} from "@/lib/game-data"
import { MobilePageHeader } from "./mobile-shell"

const TONE_TEXT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "text-chart-1",
  2: "text-chart-2",
  3: "text-chart-3",
  4: "text-chart-4",
  5: "text-chart-5",
}
const TONE_BORDER: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "border-chart-1/40",
  2: "border-chart-2/40",
  3: "border-chart-3/50",
  4: "border-chart-4/60",
  5: "border-chart-5/70",
}

export function MobileSynthesisPage() {
  const { messages: loc } = useLocale()
  const sy = loc.game.synthesis
  const su = loc.game.summon
  const s = loc.game.shared

  const {
    connected,
    connect,
    advent,
    inventory,
    synthesize,
    finalizeSynthesize,
    cancelSynthesize,
    pendingSynthesis,
    currentBlock,
    rngDelayBlocks,
    isTxPending,
    characters,
  } = useGame()

  const [animLevel, setAnimLevel] = React.useState<RarityLevel | null>(null)
  const [animOpen, setAnimOpen] = React.useState(false)
  const [animResult, setAnimResult] = React.useState<Character | null>(null)
  const charsBeforeFinalizeRef = React.useRef<number | null>(null)

  const hasPending = !!pendingSynthesis
  const blocksRemaining = pendingSynthesis
    ? Number(
        pendingSynthesis.readyAtBlock > currentBlock
          ? pendingSynthesis.readyAtBlock - currentBlock
          : 0n,
      )
    : 0
  const totalDelayBlocks = Number(rngDelayBlocks || 1n)
  const waitProgress = pendingSynthesis
    ? Math.min(
        100,
        ((totalDelayBlocks - blocksRemaining) / totalDelayBlocks) * 100,
      )
    : 0
  const isExpired = !!pendingSynthesis?.expired
  const isReady = !!pendingSynthesis?.ready && !isExpired
  const isWaiting = hasPending && !isReady && !isExpired

  const startSynthesis = async (level: RarityLevel) => {
    if (hasPending || isTxPending) return
    await synthesize(level)
  }

  const handleFinalize = async () => {
    if (!isReady || isTxPending) return
    const level = pendingSynthesis!.targetLevel
    charsBeforeFinalizeRef.current = characters.length
    setAnimLevel(level)
    const ok = await finalizeSynthesize()
    if (ok) {
      setAnimResult(null)
      setAnimOpen(true)
    }
  }

  React.useEffect(() => {
    if (!animOpen || animResult) return
    const before = charsBeforeFinalizeRef.current
    if (before == null) return
    if (characters.length > before) {
      setAnimResult(characters[0])
    }
  }, [animOpen, animResult, characters])

  return (
    <>
      <MobilePageHeader title={sy.title} description={sy.desc} />

      <main className="px-4 pb-6">
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
          <div className="flex flex-col gap-4">
            {/* commit-reveal 状态横幅 */}
            {hasPending ? (
              <MobilePendingSynthBanner
                level={pendingSynthesis!.targetLevel}
                isReady={isReady}
                isExpired={isExpired}
                isWaiting={isWaiting}
                blocksRemaining={blocksRemaining}
                totalDelay={totalDelayBlocks}
                waitProgress={waitProgress}
                isTxPending={isTxPending}
                onFinalize={handleFinalize}
                onCancel={cancelSynthesize}
              />
            ) : null}

            {/* Inventory */}
            <Card className="border-border bg-card/60">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {sy.inventoryTag}
                </p>
                <h2 className="font-serif text-base">{sy.inventory}</h2>
                <ul className="mt-2.5 grid grid-cols-2 gap-2">
                  {MATERIAL_KEYS.map((k) => (
                    <li
                      key={k}
                      className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-2.5"
                    >
                      <MaterialIcon material={k} showLabel size="sm" />
                      <span className="font-mono text-sm">
                        {inventory[k].toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-background/40 p-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <RuneAbyssLogo size={14} title={null} />
                    <span className="text-muted-foreground text-xs">{sy.adventBurn}</span>
                  </div>
                  <span className="font-mono text-sm">
                    {advent.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Synthesis cards */}
            <section>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {sy.forgeTag}
              </p>
              <h2 className="font-serif text-xl">{sy.forgeTitle}</h2>

              <ul className="mt-3 flex flex-col gap-3">
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
                  const buttonDisabled =
                    !canCraft || hasPending || isTxPending

                  return (
                    <li key={cost.level}>
                      <Card
                        className={cn(
                          "border bg-card/60",
                          TONE_BORDER[tone],
                        )}
                      >
                        <CardContent className="flex flex-col gap-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p
                                className={cn(
                                  "font-mono text-[10px]",
                                  TONE_TEXT[tone],
                                )}
                              >
                                Lv.{cost.level} ·{" "}
                                {interpolate(sy.naturalProbMobile, {
                                  pct: (rarity.prob * 100).toFixed(0),
                                })}
                              </p>
                              <h3 className="font-serif text-base">
                                {rv.name}
                              </h3>
                              <p className="text-[10px] text-muted-foreground">
                                {interpolate(s.powerRange, {
                                  min: String(rarity.powerMin),
                                  max: String(rarity.powerMax),
                                })}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "flex size-10 items-center justify-center rounded-lg border bg-background/60",
                                TONE_BORDER[tone],
                                TONE_TEXT[tone],
                              )}
                              aria-hidden
                            >
                              <FlaskConical className="size-5" />
                            </span>
                          </div>

                          <ul className="grid grid-cols-2 gap-1.5">
                            {MATERIAL_KEYS.map((k) => {
                              const need = cost[k as MaterialKey]
                              const have = inventory[k]
                              const ok = have >= need
                              return (
                                <li
                                  key={k}
                                  className={cn(
                                    "flex items-center justify-between rounded-md border p-1.5",
                                    ok
                                      ? "border-border bg-background/40"
                                      : "border-destructive/40 bg-destructive/5",
                                  )}
                                >
                                  <MaterialIcon material={k} size="sm" />
                                  <div className="text-right">
                                    <div
                                      className={cn(
                                        "font-mono text-[11px]",
                                        ok ? "" : "text-destructive",
                                      )}
                                    >
                                      {have} / {need}
                                    </div>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>

                          <div
                            className={cn(
                              "flex items-center justify-between rounded-md border p-2",
                              adventOk
                                ? "border-border bg-background/40"
                                : "border-destructive/40 bg-destructive/5",
                            )}
                          >
                            <span className="flex items-center gap-1.5 text-xs">
                              <RuneAbyssLogo size={12} title={null} />
                              <span className="text-muted-foreground">
                                $REBC
                              </span>
                            </span>
                            <span
                              className={cn(
                                "font-mono text-xs",
                                adventOk ? "" : "text-destructive",
                              )}
                            >
                              {advent.toLocaleString()} /{" "}
                              {cost.advent.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Skull className="size-3" aria-hidden />
                              {sy.toVoidShort}
                            </span>
                            <Button
                              size="sm"
                              disabled={buttonDisabled}
                              onClick={() =>
                                startSynthesis(cost.level as RarityLevel)
                              }
                              className="h-9 gap-1.5"
                            >
                              {isTxPending ? (
                                <Loader2
                                  className="size-3.5 animate-spin"
                                  aria-hidden
                                />
                              ) : (
                                <FlaskConical
                                  className="size-3.5"
                                  aria-hidden
                                />
                              )}
                              {hasPending ? sy.inProgress : sy.submit}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                <span className="text-primary">{sy.crExplainerPrefix}</span>
                {interpolate(sy.crExplainerSuffix, {
                  blocks: String(totalDelayBlocks),
                })}
              </p>
            </section>
          </div>
        )}
      </main>

      <SynthesisAnimationModal
        open={animOpen}
        level={animLevel}
        newCharacter={animResult}
        onClose={() => {
          setAnimOpen(false)
          setAnimLevel(null)
          setAnimResult(null)
          charsBeforeFinalizeRef.current = null
        }}
      />
    </>
  )
}

function MobilePendingSynthBanner({
  level,
  isReady,
  isExpired,
  isWaiting,
  blocksRemaining,
  totalDelay,
  waitProgress,
  isTxPending,
  onFinalize,
  onCancel,
}: {
  level: RarityLevel
  isReady: boolean
  isExpired: boolean
  isWaiting: boolean
  blocksRemaining: number
  totalDelay: number
  waitProgress: number
  isTxPending: boolean
  onFinalize: () => void
  onCancel: () => Promise<boolean>
}) {
  const { messages: loc } = useLocale()
  const sy = loc.game.synthesis
  const su = loc.game.summon
  const s = loc.game.shared
  const rv = displayRarity(loc.game, level)
  const statusMain = isExpired
    ? sy.statusExpired
    : isReady
      ? sy.statusReady
      : sy.statusWait
  const pendingTitle = interpolate(sy.pendingLineShort, {
    status: statusMain,
    name: rv.name,
  })

  return (
    <Card
      className={cn(
        "border bg-card/60",
        isExpired
          ? "border-destructive/40"
          : isReady
            ? "border-chart-2/45"
            : "border-primary/40",
      )}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full border",
              isExpired
                ? "border-destructive/50 bg-destructive/15 text-destructive"
                : isReady
                  ? "border-chart-2/50 bg-chart-2/15 text-chart-2"
                  : "border-primary/50 bg-primary/15 text-primary",
            )}
          >
            {isExpired ? (
              <X className="size-4" aria-hidden />
            ) : isReady ? (
              <CheckCircle2 className="size-4" aria-hidden />
            ) : (
              <Hourglass className="size-4 animate-pulse" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {isExpired
                ? sy.pendingRowTagExpired
                : isReady
                  ? sy.pendingRowTagReady
                  : sy.pendingRowTagWait}
            </p>
            <p className="font-serif text-base leading-tight">{pendingTitle}</p>
          </div>
        </div>

        {isWaiting || isReady ? (
          <div>
            <Progress value={isReady ? 100 : waitProgress} className="h-1.5" />
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
              <span>{su.blockProgress}</span>
              <span>
                {isReady
                  ? interpolate(su.blocksDone, {
                      cur: String(totalDelay),
                      total: String(totalDelay),
                    })
                  : interpolate(su.blocksNeed, { n: String(blocksRemaining) })}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{sy.synthExpiredBannerShort}</p>
        )}

        <div className="flex gap-2">
          {isExpired ? (
            <Button
              variant="outline"
              disabled={isTxPending}
              onClick={onCancel}
              className="flex-1 gap-2"
            >
              {isTxPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <X className="size-4" aria-hidden />
              )}
              {su.cancelRequest}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isTxPending}
                onClick={onCancel}
                className="flex-1"
              >
                {s.cancel}
              </Button>
              <Button
                size="sm"
                disabled={!isReady || isTxPending}
                onClick={onFinalize}
                className="flex-1 gap-1.5"
              >
                {isTxPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FlaskConical className="size-3.5" aria-hidden />
                )}
                {isTxPending ? s.revealing : sy.finishSynth}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
