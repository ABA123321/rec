"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CharacterCard } from "@/components/game/character-card"
import { useLocale } from "@/components/providers/locale-provider"
import { RuneSigil } from "@/components/brand/rune-sigil"
import { RARITIES, type RarityLevel } from "@/lib/game-data"
import type { Character } from "@/components/providers/game-provider"

const TONE_TEXT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "text-chart-1",
  2: "text-chart-2",
  3: "text-chart-3",
  4: "text-chart-4",
  5: "text-chart-5",
}

const TONE_BG: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "bg-chart-1/30",
  2: "bg-chart-2/40",
  3: "bg-chart-3/50",
  4: "bg-chart-4/60",
  5: "bg-chart-5/80",
}

type Phase = "idle" | "charge" | "burst" | "reveal" | "result"

export function SummonAnimationModal({
  open,
  onClose,
  pendingCount,
  newCharacters,
  onCommit,
}: {
  open: boolean
  onClose: () => void
  pendingCount: number
  /** 父组件在 commit 触发后把召唤产物通过 effect 传入 */
  newCharacters: Character[] | null
  /** 旧 API 兼容：在动画中段触发的回调；commit-reveal 流程下不再需要 */
  onCommit?: () => void
}) {
  const { messages: m } = useLocale()
  const a = m.game.modals.summonAnim
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [revealed, setRevealed] = React.useState(0)

  const results = newCharacters

  React.useEffect(() => {
    if (!open) return

    setPhase("charge")
    setRevealed(0)

    // 0ms: 符文阵聚能
    const t1 = setTimeout(() => {
      setPhase("burst")
    }, 1100)

    // 1100ms: 全屏爆裂 + 触发可选的中段回调（旧 API）
    const t2 = setTimeout(() => {
      onCommit?.()
      setPhase("reveal")
    }, 1500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 卡牌逐张翻面（每 220ms 揭示一张，传奇等更高稀有度延迟更久 + 额外光效）
  React.useEffect(() => {
    if (phase !== "reveal" || !results) return
    const total = results.length
    if (revealed >= total) {
      const t = setTimeout(() => setPhase("result"), 700)
      return () => clearTimeout(t)
    }
    const next = setTimeout(() => setRevealed((r) => r + 1), 220)
    return () => clearTimeout(next)
  }, [phase, results, revealed])

  const slots = React.useMemo(
    () => Array.from({ length: pendingCount }),
    [pendingCount],
  )

  const stats = React.useMemo(() => {
    if (!results) return null
    const counts: Record<RarityLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const c of results) counts[c.rarity] += 1
    return counts
  }, [results])

  const close = () => {
    setPhase("idle")
    setRevealed(0)
    onClose()
  }

  const showFooter = phase === "result" && stats

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && phase === "result") close()
      }}
    >
      <DialogContent
        showCloseButton={phase === "result"}
        className={cn(
          "flex min-h-0 w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden border-primary/40 bg-card p-0 shadow-xl backdrop-blur",
          "max-h-[min(90dvh,calc(100%-1rem))] sm:max-h-[92vh]",
          /* 窄屏：贴顶 + 明确高度预算，避免 50% 垂直居中把可滚动区挤出视口 / iOS 无法滚动 */
          "max-md:top-6 max-md:translate-y-0 max-md:max-h-[min(88dvh,calc(100dvh-3rem))]",
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{a.title}</DialogTitle>

        <div
          className={cn(
            "relative grid min-h-0 flex-1 overflow-hidden",
            /* minmax(0,1fr)：防止 iOS Grid 子项默认 min-height:auto 撑破，滚动区高度为 0 */
            showFooter
              ? "grid-rows-[auto_minmax(0,1fr)_auto]"
              : "grid-rows-[auto_minmax(0,1fr)]",
          )}
        >
          {/* === 顶部说明 === */}
          <div className="relative z-50 flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 bg-card/80 px-4 py-3 backdrop-blur-md sm:px-5">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                Summoning Ritual
              </p>
              <p className="font-serif text-lg text-glow-gold sm:text-xl">
                {phase === "charge"
                  ? a.charging
                  : phase === "burst"
                    ? a.burst
                    : phase === "reveal"
                      ? a.arrive
                      : a.done}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 font-mono text-[10px] sm:text-xs">
              ×{pendingCount}
            </Badge>
          </div>

          {/* === 主舞台：可滚动，避免多卡 / 小屏被 overflow-hidden 裁切 === */}
          <div className="relative flex min-h-0 flex-col overflow-hidden">
            {/* 氛围背景（限制在中栏，随区域高度变化） */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.34 0.10 80 / 0.55), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 100%, oklch(0.22 0.07 280 / 0.5), transparent 65%), linear-gradient(180deg, oklch(0.18 0.03 270) 0%, oklch(0.13 0.02 260) 100%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(ellipse 50% 40% at 50% 40%, oklch(0.84 0.16 80 / 0.18), transparent 70%)",
              }}
            />
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
              {[12, 28, 44, 58, 72, 86].map((leftPct, i) => (
                <span
                  key={i}
                  className="absolute bottom-0 size-1 rounded-full bg-primary/70 [animation:embers-rise_4s_ease-in-out_infinite] will-change-transform"
                  style={{
                    left: `${leftPct}%`,
                    animationDelay: `${i * 0.45}s`,
                    filter: "drop-shadow(0 0 6px oklch(0.84 0.16 80 / 0.85))",
                  }}
                />
              ))}
            </div>

            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
              <div
                className={cn(
                  "absolute left-1/2 top-[42%] aspect-square w-[140%] max-w-none -translate-x-1/2 -translate-y-1/2 sm:top-1/2",
                  phase === "charge" && "[animation:summon-charge_1.1s_ease-out_forwards]",
                  (phase === "burst" || phase === "reveal" || phase === "result") &&
                    "opacity-70 [animation:rune-spin_18s_linear_infinite]",
                )}
              >
                <RuneSigil opacity={0.95} className="h-full w-full" />
              </div>
            </div>

            {phase === "burst" ? (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 z-40 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/80 [animation:summon-burst_500ms_ease-out_forwards]"
                aria-hidden
              />
            ) : null}
            {phase === "burst" ? (
              <div
                className="pointer-events-none absolute inset-0 z-[45] bg-primary [animation:crit-flash_500ms_ease-out_forwards]"
                aria-hidden
              />
            ) : null}

            <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain touch-pan-y px-2.5 py-2.5 [-webkit-overflow-scrolling:touch] sm:px-8 sm:py-8">
              {(phase === "charge" || phase === "burst") && (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
                  {slots.map((_, i) => (
                    <EmptySlot key={i} index={i} active={phase === "charge"} />
                  ))}
                </div>
              )}

              {(phase === "reveal" || phase === "result") && results ? (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
                  {results.map((c, i) => {
                    const isRevealed = i < revealed || phase === "result"
                    return (
                      <div
                        key={c.id}
                        className="relative"
                        style={{ perspective: "800px" }}
                      >
                        {isRevealed && c.rarity >= 4 ? (
                          <div
                            aria-hidden
                            className={cn(
                              "pointer-events-none absolute -bottom-4 left-1/2 -z-10 h-[140%] w-12 max-md:-bottom-2 max-md:h-[125%] max-md:w-9 -translate-x-1/2 rounded-full opacity-70 mix-blend-screen blur-md [animation:light-pillar_700ms_ease-out_forwards]",
                              TONE_BG[c.rarity],
                            )}
                          />
                        ) : null}

                        {isRevealed ? (
                          <div
                            className={cn(
                              "[animation:card-flip-in_550ms_cubic-bezier(0.34,1.56,0.64,1)_both] [transform-style:preserve-3d]",
                              c.rarity === 5 &&
                                "[animation:legend-aura_900ms_ease-out_forwards]",
                            )}
                          >
                            <CharacterCard character={c} size="sm" dense />
                          </div>
                        ) : (
                          <SlotBack />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {showFooter && stats ? (
            <div className="relative z-50 flex shrink-0 flex-col gap-3 border-t border-primary/20 bg-card/85 px-4 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
              <div className="flex flex-wrap gap-2">
                {RARITIES.map((r) => {
                  const n = stats[r.level]
                  if (!n) return null
                  return (
                    <Badge
                      key={r.level}
                      variant="outline"
                      className={cn(
                        "border-current/40 font-mono",
                        TONE_TEXT[r.tone],
                      )}
                    >
                      {r.short} ×{n}
                    </Badge>
                  )
                })}
              </div>
              <Button onClick={close} size="sm" className="shrink-0">
                {a.claimClose}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EmptySlot({ index, active }: { index: number; active: boolean }) {
  return (
    <div
      className={cn(
        "aspect-[3/4] max-md:aspect-[5/6] rounded-xl border border-dashed border-primary/40 bg-background/40 backdrop-blur-sm",
        active && "[animation:slot-shake_300ms_ease-in-out_infinite]",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      aria-hidden
    />
  )
}

function SlotBack() {
  return (
    <div className="relative aspect-[3/4] max-md:aspect-[5/6] overflow-hidden rounded-xl border border-primary/40 bg-card/60">
      <Image
        src="/rune-sigil.png"
        alt=""
        fill
        sizes="(max-width: 640px) 50vw, 200px"
        className="object-cover opacity-50 [filter:hue-rotate(-10deg)]"
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center bg-background/40">
        <div className="font-serif text-2xl text-primary/70 text-glow-gold">?</div>
      </div>
    </div>
  )
}

