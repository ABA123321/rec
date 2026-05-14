"use client"

import * as React from "react"
import Image from "next/image"
import { FlaskConical, Flame } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MaterialIcon } from "@/components/game/material-icon"
import { RuneSigil } from "@/components/brand/rune-sigil"
import {
  MATERIAL_KEYS,
  RARITY_BY_LEVEL,
  type MaterialKey,
  type RarityLevel,
} from "@/lib/game-data"
import type { Character } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { displayRarity } from "@/lib/i18n/game-display"

const TONE_TEXT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "text-chart-1",
  2: "text-chart-2",
  3: "text-chart-3",
  4: "text-chart-4",
  5: "text-chart-5",
}

const TONE_BG: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "bg-chart-1/40",
  2: "bg-chart-2/50",
  3: "bg-chart-3/60",
  4: "bg-chart-4/70",
  5: "bg-chart-5/85",
}

type Phase = "gather" | "boil" | "burst" | "reveal" | "done"

const CORNER_ANIM: Record<number, string> = {
  0: "[animation:mat-tl_1100ms_ease-in_both]",
  1: "[animation:mat-tr_1100ms_ease-in_both]",
  2: "[animation:mat-bl_1100ms_ease-in_both]",
  3: "[animation:mat-br_1100ms_ease-in_both]",
}

export function SynthesisAnimationModal({
  open,
  level,
  newCharacter,
  onClose,
  onCommit,
}: {
  open: boolean
  level: RarityLevel | null
  /** 父组件在调用 commit 后通过 effect 把新角色传进来 */
  newCharacter: Character | null
  onClose: () => void
  /** 旧 API 兼容：动画中段触发的回调；commit-reveal 流程下不再需要 */
  onCommit?: () => void
}) {
  const { messages: loc } = useLocale()
  const sa = loc.game.modals.synthesisAnim
  const sh = loc.game.shared

  const [phase, setPhase] = React.useState<Phase>("gather")

  React.useEffect(() => {
    if (!open) return
    setPhase("gather")

    const t1 = setTimeout(() => setPhase("boil"), 1100)
    // 在爆发瞬间触发实际合成（setState 异步，新角色会在下一帧到达 newCharacter prop）
    const t2 = setTimeout(() => {
      onCommit?.()
      setPhase("burst")
    }, 2200)
    const t3 = setTimeout(() => setPhase("reveal"), 2700)
    const t4 = setTimeout(() => setPhase("done"), 3400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const close = () => {
    setPhase("gather")
    onClose()
  }

  const result = newCharacter

  const rarity = level ? RARITY_BY_LEVEL[level] : null
  const rv = level ? displayRarity(loc.game, level) : null

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && phase === "done") close()
      }}
    >
      <DialogContent
        showCloseButton={phase === "done"}
        className="max-w-2xl overflow-hidden border-primary/40 bg-card p-0 backdrop-blur"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{sa.title}</DialogTitle>

        <div className="relative isolate min-h-[480px] overflow-hidden sm:min-h-[540px]">
          {/* === 熔炉氛围背景：橙红下行光 + 金色辉光 === */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-30"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 80%, oklch(0.40 0.15 35 / 0.6), transparent 65%), radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.32 0.10 80 / 0.45), transparent 60%), linear-gradient(180deg, oklch(0.15 0.022 50) 0%, oklch(0.13 0.018 40) 100%)",
            }}
          />
          {/* 中央炽热辉光 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-20"
            style={{
              background:
                "radial-gradient(ellipse 38% 32% at 50% 55%, oklch(0.78 0.17 40 / 0.32), transparent 70%)",
            }}
          />
          {/* 上升火星粒子 */}
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            {[20, 32, 45, 55, 68, 80].map((leftPct, i) => (
              <span
                key={i}
                className="absolute bottom-0 size-1 rounded-full bg-chart-5/85 [animation:embers-rise_3.2s_ease-in-out_infinite]"
                style={{
                  left: `${leftPct}%`,
                  animationDelay: `${i * 0.35}s`,
                  filter: "drop-shadow(0 0 5px oklch(0.7 0.18 35 / 0.95))",
                }}
              />
            ))}
          </div>

          {/* 旋转符文阵 */}
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-55" aria-hidden>
            <div className="absolute left-1/2 top-1/2 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2 [animation:rune-spin_24s_linear_infinite]">
              <RuneSigil opacity={0.85} className="h-full w-full" />
            </div>
          </div>

          {/* 顶部说明 */}
          <div className="relative z-30 flex items-center justify-between gap-3 border-b border-primary/20 bg-card/40 px-5 py-3 backdrop-blur-md">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                {sa.ritualTag}
              </p>
              <p className="font-serif text-lg text-glow-gold sm:text-xl">
                {phase === "gather"
                  ? sa.gather
                  : phase === "boil"
                    ? sa.boil
                    : phase === "burst"
                      ? sa.soul
                      : phase === "reveal"
                        ? sa.newHero
                        : sa.done}
              </p>
            </div>
            {rarity && rv ? (
              <Badge
                variant="outline"
                className={cn("border-current/50 font-mono", TONE_TEXT[rarity.tone])}
              >
                {rv.name}
              </Badge>
            ) : null}
          </div>

          {/* 主舞台 */}
          <div className="relative flex h-[400px] items-center justify-center sm:h-[440px]">
            {/* gather: 4 个材料从四角飞向中心 */}
            {phase === "gather" ? (
              <>
                {(MATERIAL_KEYS as MaterialKey[]).slice(0, 4).map((matKey, i) => (
                  <div
                    key={matKey}
                    className={cn(
                      "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-card/80 p-3 backdrop-blur",
                      CORNER_ANIM[i],
                    )}
                  >
                    <MaterialIcon material={matKey} size="md" />
                  </div>
                ))}
              </>
            ) : null}

            {/* boil: 熔炉沸腾 + 火焰 */}
            {(phase === "boil" || phase === "burst") && rarity ? (
              <div className="relative flex items-center justify-center">
                {/* 火焰从下方升起 */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Flame
                        key={i}
                        className={cn(
                          "size-6 text-chart-5 sm:size-8",
                          "[animation:flame-flicker_400ms_ease-in-out_infinite]",
                        )}
                        style={{ animationDelay: `${i * 80}ms` }}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>

                {/* 熔炉 (烧瓶图标) */}
                <div
                  className={cn(
                    "relative z-10 flex size-32 items-center justify-center rounded-full border-2 border-primary/60 bg-background/40 backdrop-blur sm:size-40",
                    "[animation:forge-boil_1.1s_ease-in-out_infinite]",
                  )}
                >
                  <FlaskConical className="size-12 text-primary text-glow-gold sm:size-16" aria-hidden />
                </div>

                {/* burst: 中央能量球 */}
                {phase === "burst" ? (
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute left-1/2 top-1/2 size-20 rounded-full mix-blend-screen [animation:orb-burst_500ms_ease-out_forwards]",
                      TONE_BG[rarity.tone],
                    )}
                  />
                ) : null}
              </div>
            ) : null}

            {/* reveal / done: 新角色立绘 */}
            {(phase === "reveal" || phase === "done") && result && rarity && rv ? (
              <div className="relative flex flex-col items-center gap-3">
                {/* 光柱 */}
                {result.rarity >= 4 ? (
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -bottom-4 left-1/2 -z-10 h-[120%] w-16 -translate-x-1/2 rounded-full opacity-70 mix-blend-screen blur-md [animation:light-pillar_700ms_ease-out_forwards]",
                      TONE_BG[result.rarity],
                    )}
                  />
                ) : null}

                {/* 立绘 + 卡牌 */}
                <div className="relative w-44 sm:w-56">
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl border border-border/60 ring-1",
                      "[animation:hero-emerge_700ms_cubic-bezier(0.34,1.56,0.64,1)_both]",
                      result.rarity === 5
                        ? "ring-chart-5/80"
                        : result.rarity === 4
                          ? "ring-chart-4/70"
                          : "ring-border",
                    )}
                    style={{ aspectRatio: "3/4" }}
                  >
                    <Image
                      src={rarity.image || "/placeholder.svg"}
                      alt={interpolate(sh.portraitAlt, { name: rv.name })}
                      fill
                      sizes="(max-width: 640px) 60vw, 240px"
                      className="object-cover object-top"
                      priority
                    />
                    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent p-3">
                      <p className={cn("font-mono text-[10px]", TONE_TEXT[rarity.tone])}>
                        Lv.{rarity.level} · {rv.short}
                      </p>
                      <p className="font-serif text-base">{result.id.slice(-6)}</p>
                      <p className="font-mono text-sm text-primary">
                        {interpolate(sa.power, { n: String(result.power) })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 底部 */}
          {phase === "done" && result ? (
            <div className="relative z-30 flex flex-col gap-3 border-t border-primary/20 bg-card/50 px-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">{sa.successLine}</p>
              <Button onClick={close} size="sm">
                {sa.collection}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

