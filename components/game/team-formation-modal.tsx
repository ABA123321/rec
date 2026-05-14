"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { RuneSigil } from "@/components/brand/rune-sigil"
import type { Character } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { displayClass, displayRarity } from "@/lib/i18n/game-display"
import { RARITY_BY_LEVEL } from "@/lib/game-data"

const TONE_GLOW: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "shadow-[0_0_20px_-6px_oklch(0.7_0.02_240/0.6)]",
  2: "shadow-[0_0_22px_-6px_oklch(0.72_0.13_195/0.6)]",
  3: "shadow-[0_0_26px_-6px_oklch(0.7_0.13_230/0.65)]",
  4: "shadow-[0_0_32px_-4px_oklch(0.8_0.15_80/0.75)]",
  5: "shadow-[0_0_44px_-4px_oklch(0.7_0.18_35/0.9)]",
}

const TONE_RING: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "ring-chart-1/40",
  2: "ring-chart-2/50",
  3: "ring-chart-3/60",
  4: "ring-chart-4/70",
  5: "ring-chart-5/80",
}

type Phase = "fly-in" | "seal" | "reveal" | "done"

export function TeamFormationModal({
  open,
  members,
  teamName,
  onConfirm,
  onCancel,
}: {
  open: boolean
  members: Character[]
  teamName: string
  /** 真正调用 createTeam() */
  onConfirm: () => void
  onCancel: () => void
}) {
  const { messages: loc } = useLocale()
  const tf = loc.game.modals.teamFormation
  const sh = loc.game.shared

  const [phase, setPhase] = React.useState<Phase>("fly-in")
  const [powerCounter, setPowerCounter] = React.useState(0)

  const totalPower = members.reduce((sum, m) => sum + m.power, 0)

  React.useEffect(() => {
    if (!open) return
    setPhase("fly-in")
    setPowerCounter(0)

    const t1 = setTimeout(() => setPhase("seal"), 700)
    const t2 = setTimeout(() => setPhase("reveal"), 1300)
    const t3 = setTimeout(() => setPhase("done"), 2600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [open])

  // 战力数字滚动 (reveal 阶段)
  React.useEffect(() => {
    if (phase !== "reveal" && phase !== "done") return
    const start = performance.now()
    const duration = 900
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setPowerCounter(Math.round(eased * totalPower))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, totalPower])

  // 三角阵列站位（左下、上中、右下）
  const triangle = [
    { anim: "[animation:hero-fly-left_700ms_cubic-bezier(0.34,1.56,0.64,1)_both]", pos: "translate-y-6" },
    { anim: "[animation:hero-fly-up_700ms_cubic-bezier(0.34,1.56,0.64,1)_both]", pos: "-translate-y-2" },
    { anim: "[animation:hero-fly-right_700ms_cubic-bezier(0.34,1.56,0.64,1)_both]", pos: "translate-y-6" },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && phase === "done") onCancel()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl overflow-hidden border-primary/40 bg-card p-0 backdrop-blur"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{tf.title}</DialogTitle>

        <div className="relative isolate min-h-[500px] overflow-hidden sm:min-h-[560px]">
          {/* === 多层背景：青蓝盟约光 + 金色契约辉光 === */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-30"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 30%, oklch(0.32 0.10 220 / 0.55), transparent 65%), radial-gradient(ellipse 60% 50% at 50% 100%, oklch(0.30 0.08 80 / 0.45), transparent 60%), linear-gradient(180deg, oklch(0.16 0.025 250) 0%, oklch(0.13 0.02 250) 100%)",
            }}
          />
          {/* 中心契约金光 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-20"
            style={{
              background:
                "radial-gradient(ellipse 40% 35% at 50% 55%, oklch(0.84 0.16 80 / 0.28), transparent 70%)",
            }}
          />
          {/* 飘动光点 */}
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            {[18, 38, 62, 82].map((leftPct, i) => (
              <span
                key={i}
                className="absolute bottom-0 size-1 rounded-full bg-chart-2/80 [animation:embers-rise_5s_ease-in-out_infinite]"
                style={{
                  left: `${leftPct}%`,
                  animationDelay: `${i * 0.6}s`,
                  filter: "drop-shadow(0 0 6px oklch(0.7 0.13 230 / 0.85))",
                }}
              />
            ))}
          </div>

          {/* 旋转符文阵 */}
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden>
            <div
              className={cn(
                "absolute left-1/2 top-1/2 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2",
                "[animation:rune-spin_24s_linear_infinite]",
              )}
            >
              <RuneSigil opacity={0.85} className="h-full w-full" />
            </div>
          </div>

          {/* 顶部 banner */}
          {phase !== "fly-in" ? (
            <div
              className="absolute left-1/2 top-4 z-30 [animation:banner-drop_500ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
              aria-hidden
            >
              <div className="flex items-center gap-2 rounded-full border border-primary/50 bg-background/85 px-4 py-1.5 backdrop-blur">
                <span className="size-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_8px_currentColor]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                  {tf.pactTag}
                </span>
                <span className="font-serif text-sm text-glow-gold">{tf.banner}</span>
              </div>
            </div>
          ) : null}

          {/* 中心契约印记 */}
          {(phase === "seal" || phase === "reveal" || phase === "done") ? (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-1/2 top-1/2 z-10 size-32 -translate-x-1/2 -translate-y-1/2 sm:size-40",
                "[animation:pact-seal_600ms_cubic-bezier(0.34,1.56,0.64,1)_both]",
              )}
            >
              <div className="relative h-full w-full">
                <div className="absolute inset-0 rounded-full border-2 border-primary/70 bg-primary/15 [animation:rune-spin_8s_linear_infinite]" />
                <div className="absolute inset-3 rounded-full border border-primary/40" />
                <div className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-glow-gold sm:text-4xl">
                  ⛧
                </div>
              </div>
            </div>
          ) : null}

          {/* 三角阵立绘 */}
          <div className="relative z-20 flex h-[400px] items-center justify-center px-6 sm:h-[460px] sm:px-10">
            <div className="grid w-full max-w-2xl grid-cols-3 items-end gap-3 sm:gap-6">
              {[members[0], members[1], members[2]].map((member, i) => {
                if (!member) return <div key={i} />
                const rarityRow = RARITY_BY_LEVEL[member.rarity]
                const rv = displayRarity(loc.game, member.rarity)
                const t = triangle[i]
                return (
                  <div
                    key={member.id}
                    className={cn(
                      "relative overflow-hidden rounded-xl ring-1",
                      "border border-border/60 bg-card/60",
                      TONE_RING[member.rarity],
                      TONE_GLOW[member.rarity],
                      t.pos,
                      t.anim,
                    )}
                    style={{ animationDelay: `${i * 90}ms`, aspectRatio: "3/4.4" }}
                  >
                    <Image
                      src={rarityRow.image || "/placeholder.svg"}
                      alt={interpolate(sh.portraitAlt, { name: rv.name })}
                      fill
                      sizes="(max-width: 640px) 33vw, 220px"
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent p-2">
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {displayClass(loc.game, member.classIndex)}
                      </p>
                      <p className="font-serif text-sm leading-tight">
                        {rv.short}
                      </p>
                      <p className="font-mono text-xs text-primary">{member.power}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 底部信息条 */}
          <div className="relative z-30 flex flex-col gap-3 border-t border-primary/20 bg-card/50 px-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {tf.squadPowerLabel}
              </p>
              <p className="font-serif text-2xl text-glow-gold">
                {teamName || tf.unnamed}
                <Badge
                  variant="outline"
                  className="ml-3 border-primary/40 font-mono text-base text-primary"
                >
                  {powerCounter}
                </Badge>
              </p>
            </div>

            {phase === "done" ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCancel}>
                  {tf.back}
                </Button>
                <Button size="sm" onClick={onConfirm}>
                  {tf.seal}
                </Button>
              </div>
            ) : (
              <p className="font-mono text-xs text-muted-foreground">
                {tf.sealing}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
