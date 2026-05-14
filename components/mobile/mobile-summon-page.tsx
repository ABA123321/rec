"use client"

import * as React from "react"
import Image from "next/image"
import {
  CheckCircle2,
  Hourglass,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { RuneAbyssLogo } from "@/components/brand/rune-abyss-logo"
import { RuneSigil } from "@/components/brand/rune-sigil"
import { SummonAnimationModal } from "@/components/game/summon-animation-modal"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import type { Character } from "@/components/providers/game-provider"
import type { Messages } from "@/lib/i18n/dictionaries/zh"
import { interpolate } from "@/lib/i18n/interpolate"
import { displayRarity } from "@/lib/i18n/game-display"
import {
  RARITIES,
  RARITY_BY_LEVEL,
  SUMMON_TIER_SIZE,
  summonCapPhaseProgress,
} from "@/lib/game-data"
import type { RarityLevel } from "@/lib/game-data"
import { MobilePageHeader, MobileSection } from "./mobile-shell"

const COUNT_OPTIONS = [1, 5, 10] as const

const SUMMON_LINEUP: Array<{
  level: RarityLevel
  heightCls: string
  zCls: string
}> = [
  { level: 1, heightCls: "h-32", zCls: "z-10" },
  { level: 3, heightCls: "h-40", zCls: "z-20" },
  { level: 5, heightCls: "h-48", zCls: "z-40" },
  { level: 4, heightCls: "h-44", zCls: "z-30" },
  { level: 2, heightCls: "h-36", zCls: "z-10" },
]

const TONE_BORDER: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "ring-chart-1/40",
  2: "ring-chart-2/50",
  3: "ring-chart-3/60",
  4: "ring-chart-4/70",
  5: "ring-chart-5/80",
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
  2: "shadow-[0_0_16px_-6px_oklch(0.72_0.13_195/0.55)]",
  3: "shadow-[0_0_18px_-6px_oklch(0.7_0.13_230/0.55)]",
  4: "shadow-[0_0_22px_-4px_oklch(0.8_0.15_80/0.7)]",
  5: "shadow-[0_0_26px_-4px_oklch(0.7_0.18_35/0.85)]",
}

const TONE_DOT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
}

export function MobileSummonPage() {
  const {
    connected,
    advent,
    characters,
    globalSummoned,
    charCap,
    currentSummonCost,
    summon,
    finalizeDraw,
    cancelDraw,
    pendingDraw,
    currentBlock,
    rngDelayBlocks,
    isTxPending,
    isAdventApproved,
    approveAdvent,
  } = useGame()

  const { messages: m } = useLocale()
  const g = m.game.summon
  const s = m.game.shared

  const [count, setCount] = React.useState<number>(1)
  const [animOpen, setAnimOpen] = React.useState(false)
  const [animResult, setAnimResult] = React.useState<Character[] | null>(null)
  const charsBeforeFinalizeRef = React.useRef<number | null>(null)

  const total = currentSummonCost * count
  const canAfford = advent >= total
  const tier = Math.floor(globalSummoned / SUMMON_TIER_SIZE)
  const nextTierIn = SUMMON_TIER_SIZE - (globalSummoned % SUMMON_TIER_SIZE)
  const capPhase = summonCapPhaseProgress(globalSummoned, charCap)

  const hasPending = !!pendingDraw
  const blocksRemaining = pendingDraw
    ? Number(
        pendingDraw.readyAtBlock > currentBlock
          ? pendingDraw.readyAtBlock - currentBlock
          : 0n,
      )
    : 0
  const totalDelayBlocks = Number(rngDelayBlocks || 1n)
  const waitProgress = pendingDraw
    ? Math.min(
        100,
        ((totalDelayBlocks - blocksRemaining) / totalDelayBlocks) * 100,
      )
    : 0

  const handleSummon = async () => {
    if (
      !connected ||
      !canAfford ||
      hasPending ||
      isTxPending ||
      !isAdventApproved
    )
      return
    await summon(count)
  }

  const handleApprove = async () => {
    if (!connected || isTxPending) return
    await approveAdvent()
  }

  const handleFinalize = async () => {
    if (!pendingDraw?.ready || isTxPending) return
    charsBeforeFinalizeRef.current = characters.length
    const ok = await finalizeDraw()
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
      const fresh = characters.slice(before)
      setAnimResult(fresh)
    }
  }, [animOpen, animResult, characters])

  const isExpired = !!pendingDraw?.expired
  const isReady = !!pendingDraw?.ready && !isExpired
  const isWaiting = hasPending && !isReady && !isExpired
  const needsApproval = connected && !isAdventApproved

  return (
    <>
      <MobilePageHeader
        title={g.title}
        description={interpolate(g.descMobile, {
          cost: currentSummonCost.toLocaleString(),
        })}
      />

      <main className="flex flex-col gap-4 px-4 pb-6">
        {/* === 召唤阵 === */}
        <Card className="overflow-hidden border-border bg-card/40 p-0">
          <CardContent className="p-0">
            <div className="relative isolate overflow-hidden">
              <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
                <div
                  className={cn(
                    "absolute left-1/2 top-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 transition duration-700",
                    hasPending && "scale-110",
                  )}
                >
                  <RuneSigil
                    spin
                    opacity={hasPending ? 0.8 : 0.5}
                    className={cn("h-full w-full", isWaiting && "animate-pulse")}
                  />
                </div>
              </div>

              <div
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 50% 70%, oklch(0.8 0.15 80 / 0.28), transparent 70%)",
                }}
                aria-hidden
              />

              <div className="flex items-center justify-between gap-2 px-4 pt-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" aria-hidden />
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                    Summoning Circle
                  </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                  {g.lineupTagline}
                </span>
              </div>

              <div className="relative flex items-end justify-center gap-0.5 px-1 pt-3">
                {SUMMON_LINEUP.map(({ level, heightCls, zCls }) => {
                  const r = RARITY_BY_LEVEL[level]
                  const rv = displayRarity(m.game, level)
                  const isCenter = level === 5
                  return (
                    <div
                      key={level}
                      className={cn(
                        "group relative flex-1 overflow-hidden rounded-t-xl border border-border/40 bg-background/40 ring-1 transition duration-500",
                        heightCls,
                        zCls,
                        TONE_BORDER[r.tone],
                        TONE_GLOW[r.tone],
                        "max-w-[22%]",
                        isWaiting && "animate-pulse",
                      )}
                      aria-label={interpolate(s.probAria, {
                        name: rv.name,
                        pct: (r.prob * 100).toFixed(0),
                      })}
                    >
                      <Image
                        src={r.image || "/placeholder.svg"}
                        alt={interpolate(s.portraitAlt, { name: rv.name })}
                        fill
                        sizes="20vw"
                        className="object-cover object-top"
                        priority={level >= 4}
                      />
                      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background/70 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent p-1.5">
                        <div
                          className={cn(
                            "font-serif text-[10px] leading-tight",
                            TONE_TEXT[r.tone],
                          )}
                        >
                          {rv.short}
                        </div>
                        <div className="font-mono text-[9px] text-muted-foreground">
                          {(r.prob * 100).toFixed(0)}%
                        </div>
                      </div>
                      {isCenter ? (
                        <div className="absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full border border-chart-5/60 bg-background/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-chart-5 backdrop-blur">
                          ★
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div
                className={cn(
                  "relative h-1 w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent transition-opacity",
                  hasPending ? "opacity-100" : "opacity-50",
                )}
                aria-hidden
              />
            </div>

            {/* 召唤面板 — commit-reveal 状态机 */}
            <div className="border-t border-border bg-background/60 px-4 py-4">
              {hasPending ? (
                <MobilePendingPanel
                  summon={g}
                  shared={s}
                  count={pendingDraw!.count}
                  isReady={isReady}
                  isExpired={isExpired}
                  blocksRemaining={blocksRemaining}
                  totalDelay={totalDelayBlocks}
                  waitProgress={waitProgress}
                  isTxPending={isTxPending}
                  onFinalize={handleFinalize}
                  onCancel={cancelDraw}
                />
              ) : (
                <MobileDefaultPanel
                  summon={g}
                  shared={s}
                  connected={connected}
                  canAfford={canAfford}
                  count={count}
                  total={total}
                  currentSummonCost={currentSummonCost}
                  isTxPending={isTxPending}
                  needsApproval={needsApproval}
                  setCount={setCount}
                  onSummon={handleSummon}
                  onApprove={handleApprove}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 全服铸造进度 */}
        <Card className="border-border bg-card/60">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Supply
            </p>
            <h3 className="mt-1 font-serif text-base">{g.globalMint}</h3>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {interpolate(g.phaseLineMobile, {
                cur: String(capPhase.phaseDisplay),
                total: String(capPhase.phaseTotal),
                size: SUMMON_TIER_SIZE.toLocaleString(),
              })}
            </p>
            <div className="mt-2 flex items-baseline justify-between font-mono">
              <span className="text-xl text-primary">
                {capPhase.phaseFilled.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                / {capPhase.phaseSize.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {g.cumulative}{" "}
              <span className="font-mono text-foreground/90">
                {globalSummoned.toLocaleString()} / {charCap.toLocaleString()}
              </span>
            </p>
            <Progress value={capPhase.phasePct} className="mt-2 h-1.5" />
            <ul className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <li className="rounded-md border border-border/60 bg-background/50 p-2">
                <p className="text-[10px] text-muted-foreground">{g.tierLabel}</p>
                <p className="mt-0.5 font-mono text-sm">
                  {interpolate(g.tierN, { n: String(tier + 1) })}
                </p>
              </li>
              <li className="rounded-md border border-border/60 bg-background/50 p-2">
                <p className="text-[10px] text-muted-foreground">{g.nextTierLabel}</p>
                <p className="mt-0.5 font-mono text-sm">
                  {interpolate(g.nextTierCount, { n: String(nextTierIn) })}
                </p>
              </li>
              <li className="rounded-md border border-border/60 bg-background/50 p-2">
                <p className="text-[10px] text-muted-foreground">{g.priceLabel}</p>
                <p className="mt-0.5 font-mono text-sm text-primary">
                  {currentSummonCost.toLocaleString()}
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 我的冒险者 */}
        <Card className="border-border bg-card/60">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Roster
              </p>
              <h3 className="mt-1 font-serif text-base">{g.myAdventurers}</h3>
              <p className="text-[10px] text-muted-foreground">{g.ownedCap}</p>
            </div>
            <p className="font-serif text-3xl text-glow-gold">
              {characters.length}
            </p>
          </CardContent>
        </Card>

        {/* 概率表 */}
        <MobileSection eyebrow="Probability" title={g.rarityTitle} description={g.rarityDesc}>
          <ul className="grid grid-cols-1 gap-2">
            {RARITIES.map((r) => {
              const rv = displayRarity(m.game, r.level)
              return (
              <li
                key={r.level}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn("size-2.5 rounded-full", TONE_DOT[r.tone])}
                    aria-hidden
                  />
                  <div>
                    <div className="font-serif text-sm">{rv.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {interpolate(s.powerRange, {
                        min: String(r.powerMin),
                        max: String(r.powerMax),
                      })}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-sm">
                  {(r.prob * 100).toFixed(0)}%
                </span>
              </li>
              )
            })}
          </ul>
        </MobileSection>

        {/* 说明 */}
        <Card className="border-border bg-card/60">
          <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              <span className="text-primary">commit–reveal</span> —{" "}
              {interpolate(g.crExplainer, { blocks: String(totalDelayBlocks) })}
            </p>
          </CardContent>
        </Card>
      </main>

      <SummonAnimationModal
        open={animOpen}
        onClose={() => {
          setAnimOpen(false)
          setAnimResult(null)
          charsBeforeFinalizeRef.current = null
        }}
        pendingCount={animResult?.length ?? pendingDraw?.count ?? 1}
        newCharacters={animResult}
      />
    </>
  )
}

function MobileDefaultPanel({
  summon: g,
  shared: s,
  connected,
  canAfford,
  count,
  total,
  currentSummonCost,
  isTxPending,
  needsApproval,
  setCount,
  onSummon,
  onApprove,
}: {
  summon: Messages["game"]["summon"]
  shared: Messages["game"]["shared"]
  connected: boolean
  canAfford: boolean
  count: number
  total: number
  currentSummonCost: number
  isTxPending: boolean
  needsApproval: boolean
  setCount: (n: number) => void
  onSummon: () => void
  onApprove: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {g.costPerSummon}
        </p>
        <p className="mt-1 font-serif text-2xl text-glow-gold">
          {currentSummonCost.toLocaleString()}{" "}
          <span className="text-sm text-muted-foreground">$REBC</span>
        </p>
      </div>

      <ButtonGroup className="w-full">
        {COUNT_OPTIONS.map((n) => (
          <Button
            key={n}
            variant={count === n ? "default" : "outline"}
            onClick={() => setCount(n)}
            className="flex-1"
            disabled={isTxPending || needsApproval}
          >
            ×{n}
          </Button>
        ))}
      </ButtonGroup>

      {/* 步骤指示 */}
      <ol className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]">
        <li
          className={cn(
            "flex flex-1 items-center gap-1.5 rounded-md border px-2 py-1.5 transition",
            !needsApproval
              ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
              : "border-primary/50 bg-primary/10 text-primary",
          )}
        >
          {!needsApproval ? (
            <ShieldCheck className="size-3" aria-hidden />
          ) : (
            <KeyRound className="size-3" aria-hidden />
          )}
          <span>{g.step1}</span>
        </li>
        <li className="text-muted-foreground" aria-hidden>
          →
        </li>
        <li
          className={cn(
            "flex flex-1 items-center gap-1.5 rounded-md border px-2 py-1.5 transition",
            !needsApproval
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/60 bg-muted/30 text-muted-foreground",
          )}
        >
          <Sparkles className="size-3" aria-hidden />
          <span>{g.step2Mobile}</span>
        </li>
      </ol>

      {needsApproval ? (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={isTxPending}
            onClick={onApprove}
            className="h-12 gap-2"
          >
            {isTxPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="size-4" aria-hidden />
            )}
            {isTxPending ? s.authorizing : g.approveBtn}
          </Button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{g.approveHint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={!connected || !canAfford || isTxPending}
            onClick={onSummon}
            className="h-12 gap-2"
          >
            {isTxPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RuneAbyssLogo size={16} title={null} />
            )}
            {isTxPending
              ? s.submitting
              : interpolate(g.summonBtn, {
                  count: String(count),
                  total: total.toLocaleString(),
                })}
          </Button>
          {!connected ? (
            <p className="text-[11px] text-muted-foreground">{g.connectHint}</p>
          ) : !canAfford ? (
            <p className="text-[11px] text-chart-5">
              {interpolate(s.insufficientSummon, { count: String(count) })}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

function MobilePendingPanel({
  summon: g,
  shared: s,
  count,
  isReady,
  isExpired,
  blocksRemaining,
  totalDelay,
  waitProgress,
  isTxPending,
  onFinalize,
  onCancel,
}: {
  summon: Messages["game"]["summon"]
  shared: Messages["game"]["shared"]
  count: number
  isReady: boolean
  isExpired: boolean
  blocksRemaining: number
  totalDelay: number
  waitProgress: number
  isTxPending: boolean
  onFinalize: () => void
  onCancel: () => void | Promise<boolean>
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isExpired ? (
            <X className="size-4 text-chart-5" aria-hidden />
          ) : isReady ? (
            <CheckCircle2 className="size-4 text-chart-2" aria-hidden />
          ) : (
            <Hourglass className="size-4 animate-pulse text-primary" aria-hidden />
          )}
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {isExpired
              ? "Request expired"
              : isReady
                ? "Reveal ready"
                : "Awaiting block"}
          </p>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
          ×{count}
        </span>
      </div>

      {!isExpired ? (
        <div>
          <Progress value={waitProgress} className="h-1.5" />
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>{Math.floor(waitProgress)}%</span>
            <span>
              {interpolate(g.blocksLeft, {
                left: String(blocksRemaining),
                total: String(totalDelay),
              })}
            </span>
          </div>
        </div>
      ) : null}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {isExpired ? g.revealExpired : isReady ? g.revealReady : g.revealWait}
      </p>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          disabled={!isReady || isExpired || isTxPending}
          onClick={onFinalize}
          className="h-12 gap-2"
        >
          {isTxPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RuneAbyssLogo size={16} title={null} />
          )}
          {isReady ? g.finalizeReady : g.finalizeWait}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={isTxPending}
          onClick={onCancel}
          className="h-11 gap-2"
        >
          <X className="size-4" aria-hidden />
          {g.cancelRequest}
        </Button>
      </div>
    </div>
  )
}
