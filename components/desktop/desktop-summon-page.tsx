"use client"

import * as React from "react"
import Image from "next/image"
import { KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { GrassrootsTokenIcon } from "@/components/brand/grassroots-token-icon"
import { RuneSigil } from "@/components/brand/rune-sigil"
import { TopBar } from "@/components/game/top-bar"
import { SummonAnimationModal } from "@/components/game/summon-animation-modal"
import { SummonOpensCountdown } from "@/components/game/summon-opens-countdown"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { displayRarity } from "@/lib/i18n/game-display"
import {
  RARITIES,
  RARITY_BY_LEVEL,
  SUMMON_TIER_SIZE,
  summonCapPhaseProgress,
} from "@/lib/game-data"
import type { RarityLevel } from "@/lib/game-data"
import type { Character } from "@/components/providers/game-provider"
import type { Messages } from "@/lib/i18n/dictionaries/zh"

const COUNT_OPTIONS = [1, 5, 10] as const

const SUMMON_LINEUP: Array<{
  level: RarityLevel
  heightCls: string
  zCls: string
}> = [
  { level: 1, heightCls: "h-44 sm:h-52", zCls: "z-10" },
  { level: 3, heightCls: "h-56 sm:h-64", zCls: "z-20" },
  { level: 5, heightCls: "h-64 sm:h-[19rem]", zCls: "z-40" },
  { level: 4, heightCls: "h-60 sm:h-72", zCls: "z-30" },
  { level: 2, heightCls: "h-48 sm:h-56", zCls: "z-10" },
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
  2: "shadow-[0_0_20px_-6px_oklch(0.72_0.13_195/0.55)]",
  3: "shadow-[0_0_24px_-6px_oklch(0.7_0.13_230/0.55)]",
  4: "shadow-[0_0_30px_-4px_oklch(0.8_0.15_80/0.7)]",
  5: "shadow-[0_0_40px_-4px_oklch(0.7_0.18_35/0.85)]",
}

export function DesktopSummonPage() {
  const {
    connected,
    advent,
    characters,
    globalSummoned,
    charCap,
    currentSummonCost,
    drawOpensAt,
    isSummonOpen,
    summon,
    isTxPending,
    isAdventApproved,
    approveAdvent,
  } = useGame()

  const { messages: m, locale } = useLocale()
  const g = m.game.summon
  const s = m.game.shared

  const opensAtFormatted =
    drawOpensAt > 0
      ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Shanghai",
        }).format(drawOpensAt * 1000)
      : ""

  const [count, setCount] = React.useState<number>(1)
  const [animOpen, setAnimOpen] = React.useState(false)
  const [animResult, setAnimResult] = React.useState<Character[] | null>(null)
  // 交易前记录 characters 长度，差值就是新铸造的角色
  const charsBeforeSummonRef = React.useRef<number | null>(null)

  const total = currentSummonCost * count
  const canAfford = advent >= total
  const tier = Math.floor(globalSummoned / SUMMON_TIER_SIZE)
  const nextTierIn = SUMMON_TIER_SIZE - (globalSummoned % SUMMON_TIER_SIZE)
  const capPhase = summonCapPhaseProgress(globalSummoned, charCap)

  const handleSummon = async () => {
    if (!connected || !canAfford || isTxPending || !isAdventApproved || !isSummonOpen) return
    charsBeforeSummonRef.current = characters.length
    const result = await summon(count)
    if (result.ok) {
      setAnimResult(null)
      setAnimOpen(true)
    }
  }

  const handleApprove = async () => {
    if (!connected || isTxPending) return
    await approveAdvent()
  }

  React.useEffect(() => {
    if (!animOpen || animResult) return
    const before = charsBeforeSummonRef.current
    if (before == null) return
    if (characters.length > before) {
      const fresh = characters.slice(before)
      setAnimResult(fresh)
    }
  }, [animOpen, animResult, characters])

  return (
    <>
      <TopBar title={g.title} description={g.descDesktop} />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: hero summon */}
          <section className="flex flex-col gap-6">
            <Card className="overflow-hidden border-border bg-card/40 p-0">
              <CardContent className="p-0">
                {/* === 召唤阵 === */}
                <div className="relative isolate overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
                    <div
                      className={cn(
                        "absolute left-1/2 top-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 transition duration-700",
                      )}
                    >
                      <RuneSigil spin opacity={0.55} className="h-full w-full" />
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

                  <div className="flex items-center justify-between gap-3 px-6 pt-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" aria-hidden />
                      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                        Summoning Circle
                      </span>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      {g.lineupTagline}
                    </span>
                  </div>

                  <div className="relative flex items-end justify-center gap-1 px-2 pt-4 sm:gap-2 sm:px-6">
                    {SUMMON_LINEUP.map(({ level, heightCls, zCls }) => {
                      const r = RARITY_BY_LEVEL[level]
                      const rv = displayRarity(m.game, level)
                      const isCenter = level === 5
                      return (
                        <div
                          key={level}
                          className={cn(
                            "group relative flex-1 overflow-hidden rounded-t-2xl border border-border/40 bg-background/40 ring-1 transition duration-500",
                            heightCls,
                            zCls,
                            TONE_BORDER[r.tone],
                            TONE_GLOW[r.tone],
                            "max-w-[22%]",
                            isCenter && "hover:-translate-y-1",
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
                            sizes="(max-width: 640px) 22vw, 160px"
                            className="object-cover object-top"
                            priority={level >= 4}
                          />
                          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/70 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent p-2">
                            <div
                              className={cn(
                                "font-serif text-xs leading-tight sm:text-sm",
                                TONE_TEXT[r.tone],
                              )}
                            >
                              {rv.short}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {(r.prob * 100).toFixed(0)}%
                            </div>
                          </div>
                          {isCenter ? (
                            <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border border-chart-5/60 bg-background/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-chart-5 backdrop-blur">
                              ★ Legendary
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  <div
                    className="relative h-1.5 w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-50"
                    aria-hidden
                  />
                </div>

                <div className="border-t border-border bg-background/60 px-6 py-5">
                  <SummonOpensCountdown
                    opensAtSec={drawOpensAt}
                    labels={{
                      title: g.drawOpensTitle,
                      countdown: g.drawOpensCountdown,
                      opensAtLabel: g.drawOpensAtLabel,
                      opensAt: opensAtFormatted,
                      unit: g.drawCountdownUnit,
                    }}
                    className="mb-5"
                  />
                  <DefaultPanel
                      summon={g}
                      shared={s}
                      connected={connected}
                      canAfford={canAfford}
                      isSummonOpen={isSummonOpen}
                      count={count}
                      total={total}
                      currentSummonCost={currentSummonCost}
                      isTxPending={isTxPending}
                      isApproved={isAdventApproved}
                      setCount={setCount}
                      onSummon={handleSummon}
                      onApprove={handleApprove}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Probability table */}
            <Card className="border-border bg-card/60">
              <CardContent className="p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Probability
                </p>
                <h2 className="mt-1 font-serif text-xl">{g.rarityTitle}</h2>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {RARITIES.map((r) => {
                    const rv = displayRarity(m.game, r.level)
                    const toneDot: Record<1 | 2 | 3 | 4 | 5, string> = {
                      1: "bg-chart-1",
                      2: "bg-chart-2",
                      3: "bg-chart-3",
                      4: "bg-chart-4",
                      5: "bg-chart-5",
                    }
                    return (
                      <li
                        key={r.level}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`size-2.5 rounded-full ${toneDot[r.tone]}`}
                            aria-hidden
                          />
                          <div>
                            <div className="font-serif text-sm">{rv.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {interpolate(s.powerRange, {
                                min: String(r.powerMin),
                                max: String(r.powerMax),
                              })}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-base">
                          {(r.prob * 100).toFixed(0)}%
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Right: meta info */}
          <aside className="flex flex-col gap-4">
            <Card className="border-border bg-card/60">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Supply</p>
                <h3 className="mt-1 font-serif text-lg">{g.globalMint}</h3>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {interpolate(g.phaseLineDesktop, {
                    cur: String(capPhase.phaseDisplay),
                    total: String(capPhase.phaseTotal),
                    size: SUMMON_TIER_SIZE.toLocaleString(),
                  })}
                </p>
                <div className="mt-2 flex items-baseline justify-between font-mono">
                  <span className="text-2xl text-primary">
                    {capPhase.phaseFilled.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {capPhase.phaseSize.toLocaleString()}
                  </span>
                </div>
                <Progress value={capPhase.phasePct} className="mt-2 h-2" />
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">{g.stairCurrent}</span>
                    <span className="font-mono">
                      {interpolate(g.tierN, { n: String(tier + 1) })} (+
                      {(tier * 10).toFixed(0)}%)
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">{g.nextTierLabel}</span>
                    <span className="font-mono">
                      {interpolate(g.nextTierCount, { n: String(nextTierIn) })}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">{g.priceLabel}</span>
                    <span className="font-mono text-primary">
                      {currentSummonCost.toLocaleString()}
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Roster</p>
                <h3 className="mt-1 font-serif text-lg">{g.myAdventurers}</h3>
                <p className="mt-2 text-3xl font-serif">{characters.length}</p>
                <p className="text-[11px] text-muted-foreground">{g.ownedCap}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60">
              <CardContent className="p-5 text-sm leading-relaxed text-muted-foreground">
                <p>召唤在单笔交易中即时完成，结果由链上伪随机数决定。</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {/* 召唤动画弹窗 */}
      <SummonAnimationModal
        open={animOpen}
        onClose={() => {
          setAnimOpen(false)
          setAnimResult(null)
          charsBeforeSummonRef.current = null
        }}
        pendingCount={animResult?.length ?? count}
        newCharacters={animResult}
      />
    </>
  )
}

function DefaultPanel({
  summon: g,
  shared: s,
  connected,
  canAfford,
  isSummonOpen,
  count,
  total,
  currentSummonCost,
  isTxPending,
  isApproved,
  setCount,
  onSummon,
  onApprove,
}: {
  summon: Messages["game"]["summon"]
  shared: Messages["game"]["shared"]
  connected: boolean
  canAfford: boolean
  isSummonOpen: boolean
  count: number
  total: number
  currentSummonCost: number
  isTxPending: boolean
  isApproved: boolean
  setCount: (n: number) => void
  onSummon: () => void
  onApprove: () => void
}) {
  // 未授权（且已连接钱包）→ 渲染独立的"授权"步骤；
  // 钱包未连接时统一走授权同样的占位 UI，但按钮 disabled 并提示。
  const needsApproval = connected && !isApproved

  return (
    <div className="flex flex-col gap-5">
      {/* 顶部：单价 + 数量切换 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {g.costPerSummon}
          </p>
          <p className="mt-1 font-serif text-3xl text-glow-gold">
            {currentSummonCost.toLocaleString()}{" "}
            <span className="text-base text-muted-foreground">$草根社</span>
          </p>
        </div>

        <ButtonGroup>
          {COUNT_OPTIONS.map((n) => (
            <Button
              key={n}
              variant={count === n ? "default" : "outline"}
              onClick={() => setCount(n)}
              className="px-4"
              disabled={isTxPending || needsApproval}
            >
              ×{n}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {/* 两步进度指示：授权 → 召唤 */}
      <ol className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em]">
        <li
          className={cn(
            "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 transition",
            isApproved
              ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
              : "border-primary/50 bg-primary/10 text-primary",
          )}
        >
          {isApproved ? (
            <ShieldCheck className="size-3.5" aria-hidden />
          ) : (
            <KeyRound className="size-3.5" aria-hidden />
          )}
          <span>{g.step1} $草根社</span>
        </li>
        <li className="text-muted-foreground" aria-hidden>
          →
        </li>
        <li
          className={cn(
            "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 transition",
            isApproved
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/60 bg-muted/30 text-muted-foreground",
          )}
        >
          <Sparkles className="size-3.5" aria-hidden />
          <span>{g.step2Desktop}</span>
        </li>
      </ol>

      {/* 主操作按钮 — 根据授权状态切换 */}
      {needsApproval ? (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={isTxPending}
            onClick={onApprove}
            className="gap-2"
          >
            {isTxPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="size-4" aria-hidden />
            )}
            {isTxPending ? s.authorizing : g.approveBtnDesktop}
          </Button>
          <p className="text-right text-xs text-muted-foreground">{g.approveHint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={!connected || !canAfford || isTxPending || !isSummonOpen}
            onClick={onSummon}
            className="gap-2"
          >
            {isTxPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <GrassrootsTokenIcon size={16} title={null} />
            )}
            {isTxPending
              ? s.submitting
              : interpolate(g.summonBtn, {
                  count: String(count),
                  total: total.toLocaleString(),
                })}
          </Button>
          {!connected ? (
            <p className="text-right text-xs text-muted-foreground">{g.connectHint}</p>
          ) : !isSummonOpen ? (
            <p className="text-right text-xs text-muted-foreground">{g.drawNotOpenYet}</p>
          ) : !canAfford ? (
            <p className="text-right text-xs text-destructive">{s.insufficientAdvent}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
