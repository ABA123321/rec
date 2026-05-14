"use client"

import * as React from "react"
import Image from "next/image"
import {
  AlertTriangle,
  Hourglass,
  Loader2,
  Shield,
  Skull,
  Sword,
  Trophy,
  X,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MaterialIcon } from "@/components/game/material-icon"
import type {
  Character,
  ChallengeResult,
} from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import {
  displayClass,
  displayRarity,
  mergeLocalizedDungeon,
} from "@/lib/i18n/game-display"
import { MATERIAL_UNIT } from "@/lib/web3/contracts"
import {
  MATERIAL_KEYS,
  RARITY_BY_LEVEL,
  type Dungeon,
  type MaterialKey,
} from "@/lib/game-data"

const MATERIAL_UNIT_NUM = Number(MATERIAL_UNIT)

type Phase =
  | "idle"
  | "pending" // 等待钱包确认 / 链上打包
  | "failed" // 链上 revert / 用户拒签
  | "intro"
  | "attack1"
  | "attack2"
  | "attack3"
  | "victory" // 副本胜利（result.success === true）
  | "defeat" // 副本失败（result.success === false，仍掉 1/4）

interface DamageNumber {
  id: number
  heroIndex: number
  amount: number
  critical: boolean
}

export interface BattleModalProps {
  open: boolean
  onClose: () => void
  dungeon: Dungeon | null
  characters: Character[]
  /**
   * 链上挑战交易状态。父组件在打开 modal 之后立刻发起 tx，
   * 然后通过这个 prop 推 modal 进入正确阶段：
   *   "submitting" → 显示"等待钱包确认 / 上链中"
   *   "success"    → 启动战斗动画时间线，最终根据 result 揭示胜利/失败
   *   "failed"     → 显示出征失败画面与错误信息
   */
  txStatus: "submitting" | "success" | "failed" | null
  /** tx 失败时给用户看的简短原因（已被父组件 toast 展示，这里再显示一次） */
  errorMessage?: string
  /**
   * 解析自合约 `DungeonResult` 事件的真实战斗结果。
   * - result.success === true  → 走 victory 分支，全额掉落
   * - result.success === false → 走 defeat 分支，1/4 掉落（合约已经按整数算好）
   * - null（事件解析失败）     → 兜底走 victory + dungeon.output 默认掉落
   */
  result?: ChallengeResult | null
}

/**
 * 副本战斗动画弹窗：
 * pending → (success) intro → attack1/2/3 → victory → loot
 *         → (failed) failed
 * 战斗动画总时长 ~4.5s，第三击为暴击有全屏闪 + Boss 倒下。
 */
export function BattleModal({
  open,
  onClose,
  dungeon,
  characters,
  txStatus,
  errorMessage,
  result,
}: BattleModalProps) {
  const { messages: loc } = useLocale()
  const b = loc.game.modals.battle
  const sh = loc.game.shared

  const [phase, setPhase] = React.useState<Phase>("idle")
  const [bossHp, setBossHp] = React.useState(100)
  const [shake, setShake] = React.useState(0) // increments to retrigger
  const [critFlash, setCritFlash] = React.useState(false)
  const [damages, setDamages] = React.useState<DamageNumber[]>([])
  const dmgSeq = React.useRef(0)
  // 标记 timeline 是否已启动，避免 props 引用变化（如 refreshUser 后 battleHeroes 重算）
  // 导致 useEffect 重新运行从而中断/重启动画
  const timelineStartedRef = React.useRef(false)
  // 锁定 characters/dungeon 快照 — timeline 启动后不再受外部 prop 变化影响
  const lockedCharsRef = React.useRef<Character[] | null>(null)
  const lockedResultRef = React.useRef<ChallengeResult | null | undefined>(
    undefined,
  )
  // 持有所有 timeline 的 setTimeout id — cleanup 只在 modal 关闭/unmount 时执行
  // 关键 bug 修复：不要在 timeline effect 里 return cleanup，因为依赖变化时
  // React 会先 cleanup 再 re-run，cleanup 会把所有 setTimeout 清掉，
  // 导致战斗动画永远卡在 intro/attack1。
  const timeoutIdsRef = React.useRef<number[]>([])

  const clearAllTimeouts = React.useCallback(() => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id))
    timeoutIdsRef.current = []
  }, [])

  // 关闭 / 重置 — modal 关掉时回到 idle
  React.useEffect(() => {
    if (!open) {
      clearAllTimeouts()
      setPhase("idle")
      setBossHp(100)
      setShake(0)
      setCritFlash(false)
      setDamages([])
      dmgSeq.current = 0
      timelineStartedRef.current = false
      lockedCharsRef.current = null
      lockedResultRef.current = undefined
    }
  }, [open, clearAllTimeouts])

  // unmount 时确保清理
  React.useEffect(() => {
    return () => clearAllTimeouts()
  }, [clearAllTimeouts])

  // tx 状态 → phase：submitting / failed 优先，success 时再启动时间线
  React.useEffect(() => {
    if (!open) return
    if (txStatus === "submitting") {
      setPhase("pending")
      setBossHp(100)
      return
    }
    if (txStatus === "failed") {
      setPhase("failed")
      return
    }
  }, [open, txStatus])

  // 启动战斗时间线 — 一次性触发，启动后用 ref 锁定快照
  // 这样即使 runTx 完成后 refreshUser → teams 引用变化导致父组件重算 battleHeroes，
  // 已启动的 timeline 也不会被打断或重启
  React.useEffect(() => {
    if (!open) return
    if (txStatus !== "success") return
    if (timelineStartedRef.current) return
    if (!dungeon || characters.length < 3) return

    // 锁定本次战斗用到的角色/result 快照
    lockedCharsRef.current = characters
    lockedResultRef.current = result
    timelineStartedRef.current = true

    const teamPower = characters.reduce((s, c) => s + c.power, 0)
    // 三击伤害分布：依据队伍战力做点小变化
    const base = teamPower
    const dmg1 = Math.round(base * 0.32)
    const dmg2 = Math.round(base * 0.34)
    const dmg3 = base - dmg1 - dmg2 // 致命一击
    const total = dmg1 + dmg2 + dmg3
    // Boss 总血 = 攻击者总伤害（确保第三击归零，戏剧化）
    const max = total

    const pushDmg = (heroIndex: number, amount: number, critical: boolean) => {
      dmgSeq.current += 1
      const id = dmgSeq.current
      setDamages((d) => [...d, { id, heroIndex, amount, critical }])
      // 1.4s 后清理这条数字
      window.setTimeout(() => {
        setDamages((d) => d.filter((x) => x.id !== id))
      }, 1400)
    }

    const triggerShake = () => setShake((n) => n + 1)

    // 时间线（毫秒）
    const timeline: Array<{ at: number; fn: () => void }> = [
      { at: 0, fn: () => setPhase("intro") },
      {
        at: 900,
        fn: () => {
          setPhase("attack1")
          triggerShake()
          pushDmg(0, dmg1, false)
          // HP drain 同步发生
          window.setTimeout(() => {
            setBossHp(Math.max(0, Math.round(((max - dmg1) / max) * 100)))
          }, 250)
        },
      },
      {
        at: 2100,
        fn: () => {
          setPhase("attack2")
          triggerShake()
          pushDmg(1, dmg2, false)
          window.setTimeout(() => {
            setBossHp(Math.max(0, Math.round(((max - dmg1 - dmg2) / max) * 100)))
          }, 250)
        },
      },
      {
        at: 3300,
        fn: () => {
          setPhase("attack3")
          triggerShake()
          setCritFlash(true)
          pushDmg(2, dmg3, true)
          window.setTimeout(() => {
            setBossHp(0)
            setCritFlash(false)
          }, 350)
        },
      },
      {
        at: 4900,
        fn: () => {
          // 用启动时锁定的 result 快照而不是当前 props.result，避免父组件 props 变化干扰
          const r = lockedResultRef.current
          setPhase(
            r === undefined || r === null || r.success ? "victory" : "defeat",
          )
        },
      },
    ]

    // 启动所有 setTimeout，把 id 存进 ref，由 close/unmount effect 统一清理。
    // 关键：不在这里 return cleanup — 否则父组件 props 变化触发 effect 重跑时，
    // 上一次的 cleanup 会先清掉所有 setTimeout，战斗动画就死在 intro。
    const ids = timeline.map((t) => window.setTimeout(t.fn, t.at))
    timeoutIdsRef.current.push(...ids)
    // 故意省略 phase — 只有 idle/pending → 启动一次，避免 setPhase 触发再次重启时间线
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, txStatus, dungeon, characters, result])

  // 根据 result 计算实际掉落（链上 0.1 单位 → 用户视角整数 + 1 位小数）
  // 没有 result 时兜底用副本默认全额掉落
  // 注意：必须在任何 early return 之前调用，避免违反 Rules of Hooks
  // 战斗已锁定时优先使用锁定 result 快照，确保 loot 显示稳定
  const lootDrops = React.useMemo<Record<MaterialKey, number>>(() => {
    if (!dungeon) return { AE: 0, BF: 0, MR: 0, ES: 0 }
    const res = timelineStartedRef.current ? lockedResultRef.current : result
    if (res) {
      return {
        AE: Number(res.ae) / MATERIAL_UNIT_NUM,
        BF: Number(res.bf) / MATERIAL_UNIT_NUM,
        MR: Number(res.mr) / MATERIAL_UNIT_NUM,
        ES: Number(res.es) / MATERIAL_UNIT_NUM,
      }
    }
    return {
      AE: dungeon.output.AE,
      BF: dungeon.output.BF,
      MR: dungeon.output.MR,
      ES: dungeon.output.ES,
    }
  }, [dungeon, result, phase])

  if (!dungeon) return null

  const dLoc = mergeLocalizedDungeon(loc.game, dungeon)

  // timeline 启动后用锁定的快照，否则用最新 props（用于 submitting/pending 阶段预览）
  const liveCharacters = lockedCharsRef.current ?? characters
  const liveResult = timelineStartedRef.current ? lockedResultRef.current : result
  const heroes = liveCharacters.slice(0, 3)
  const inAttack =
    phase === "attack1" || phase === "attack2" || phase === "attack3"
  const isVictory = phase === "victory"
  const isDefeat = phase === "defeat"
  // 提前知道战斗结果（result 在 tx 成功时就到位） → 用于第三击就开始播对应的"倒下"动画
  // 没有 result 兜底当作胜利
  const willFail = liveResult?.success === false
  // 胜利分支：第三击 boss 起手 → victory phase boss 完全倒下
  // 失败分支：第三击触发 boss 反扑（boss-roar），队员开始倒下
  const bossDefeated = isVictory || (phase === "attack3" && !willFail)
  const heroesDefeated = isDefeat || (phase === "attack3" && willFail)
  const battleEnded = isVictory || isDefeat
  const isPending = phase === "pending"
  const isFailed = phase === "failed"
  const teamPower = heroes.reduce((sum, c) => sum + c.power, 0)
  // pending 阶段下用户不能关 — 钱包已签名 / tx 已上链时关掉 modal 也不会撤销交易，
  // 但允许关掉会导致用户错过战斗动画与材料到账反馈，所以这里禁用关闭直到 tx 完成
  const closeDisabled = isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !closeDisabled) onClose()
      }}
    >
      <DialogContent
        className="max-h-[95vh] max-w-3xl overflow-hidden border border-primary/30 p-0"
        showCloseButton={false}
        aria-describedby={undefined}
        onEscapeKeyDown={(e) => {
          if (closeDisabled) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (closeDisabled) e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">
          {interpolate(b.title, { dungeon: dLoc.name })}
        </DialogTitle>

        {/* Stage */}
        <div
          key={shake}
          className={cn(
            "relative aspect-[16/10] w-full overflow-hidden",
            shake > 0 && "animate-[battle-shake_0.32s_ease-out]",
          )}
        >
          {/* 副本场景背景 */}
          <Image
            src={dungeon.image || "/placeholder.svg"}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          {/* 暗化 + 双侧 vignette — 弱化中心，留出舞台亮度 */}
          <div className="absolute inset-0 bg-gradient-to-br from-background/30 via-transparent to-background/60" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,oklch(0.14_0.012_240/0.45)_100%)]" />
          {/* 顶部金色氛围光 */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.84 0.16 80 / 0.18), transparent 60%)",
            }}
          />

          {/* 顶部信息条 */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4">
            <div>
              <p className="rounded-md border border-primary/40 bg-background/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary backdrop-blur">
                Dungeon {dungeon.level}
              </p>
              <h3 className="mt-1.5 font-serif text-base text-balance text-foreground drop-shadow sm:text-xl">
                {dLoc.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label={b.close}
              className={cn(
                "flex size-8 items-center justify-center rounded-md border border-border/60 bg-background/60 text-muted-foreground backdrop-blur",
                closeDisabled
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-background hover:text-foreground",
              )}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {/* Boss 区 — 右上 */}
          <div className="absolute right-3 top-14 z-10 flex w-[44%] max-w-[260px] flex-col items-end gap-2 sm:right-6 sm:top-16 sm:w-[40%]">
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
                <span className="flex items-center gap-1.5 text-chart-5">
                  <Skull className="size-3.5" aria-hidden />
                  Boss
                </span>
                <span className="font-mono text-foreground">{bossHp}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-chart-5/40 bg-chart-5/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-chart-5 to-chart-4 transition-all duration-500 ease-out"
                  style={{ width: `${bossHp}%`, animation: "hp-drain 0.5s ease-out" }}
                />
              </div>
              <p className="mt-1 truncate text-right font-serif text-sm text-foreground drop-shadow sm:text-base">
                {dLoc.bossName}
              </p>
            </div>

            <div
              className={cn(
                "relative aspect-square w-full max-w-[180px] overflow-hidden rounded-2xl border border-chart-5/40",
                phase === "attack1" || phase === "attack2"
                  ? "animate-[boss-recoil_0.7s_ease-out]"
                  : "",
                // 胜利分支：第三击 boss 倒下
                bossDefeated
                  ? "animate-[boss-defeat_1.1s_ease-out_forwards]"
                  : "",
                // 失败分支：BOSS 反扑（保持立绘，亮起血光）
                heroesDefeated
                  ? "animate-[boss-roar_0.9s_ease-out_forwards] border-chart-5"
                  : "",
              )}
            >
              {/* Boss 立绘 — 用副本场景图做 silhouette + 红光 */}
              <Image
                src={dungeon.image || "/placeholder.svg"}
                alt={interpolate(b.bossAlt, { name: dLoc.bossName })}
                fill
                sizes="180px"
                className="scale-150 object-cover"
                style={{ objectPosition: "center 35%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-chart-5/40 via-background/40 to-background/10 mix-blend-multiply" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,oklch(0.7_0.18_35/0.4)_0%,transparent_60%)]" />
            </div>
          </div>

          {/* 队员区 — 左下 */}
          <div className="absolute inset-x-3 bottom-3 z-10 flex justify-start gap-2 sm:inset-x-6 sm:bottom-6">
            {heroes.map((c, i) => {
              const rarityRow = RARITY_BY_LEVEL[c.rarity]
              const rv = displayRarity(loc.game, c.rarity)
              const className =
                displayClass(loc.game, c.classIndex) || b.classFallback
              const isAttacking =
                (phase === "attack1" && i === 0) ||
                (phase === "attack2" && i === 1) ||
                (phase === "attack3" && i === 2)
              return (
                <div
                  key={c.id}
                  className={cn(
                    "relative flex w-[30%] max-w-[150px] flex-col gap-1.5",
                    isAttacking &&
                      "animate-[hero-charge_0.95s_cubic-bezier(.5,-0.2,.4,1.2)]",
                    // 失败分支：第三击起所有队员被反击击倒，错峰倒下更有节奏
                    heroesDefeated &&
                      "animate-[hero-defeat_1.2s_ease-out_forwards]",
                  )}
                  style={
                    heroesDefeated
                      ? { animationDelay: `${i * 0.12}s` }
                      : undefined
                  }
                >
                  <div
                    className={cn(
                      "relative aspect-[3/4] overflow-hidden rounded-xl border-2 bg-card/60 shadow-[0_8px_24px_oklch(0_0_0/0.5)]",
                      i === 0 && "border-chart-2/60",
                      i === 1 && "border-chart-3/60",
                      i === 2 && "border-chart-4/70",
                    )}
                  >
                    <Image
                      src={rarityRow.image || "/placeholder.svg"}
                      alt=""
                      fill
                      sizes="150px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                    <div className="absolute left-1.5 top-1.5 rounded-md border border-primary/40 bg-background/70 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-primary backdrop-blur">
                      {rv.short}
                    </div>
                    {isAttacking ? (
                      <span
                        className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-chart-4 text-background shadow-[0_0_12px_oklch(0.8_0.15_80/0.8)]"
                        aria-hidden
                      >
                        <Sword className="size-3" />
                      </span>
                    ) : null}
                    <div className="absolute inset-x-1.5 bottom-1.5">
                      <div className="truncate font-serif text-[11px] text-foreground drop-shadow sm:text-xs">
                        {className}
                      </div>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-muted-foreground">{sh.power}</span>
                        <span className="font-mono text-primary">{c.power}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 中央：剑光斩击特效 */}
          {inAttack ? (
            <div
              key={`slash-${phase}`}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              aria-hidden
            >
              <div className="relative size-[60%]">
                <div
                  className="absolute inset-0 rounded-full bg-[linear-gradient(125deg,transparent_42%,oklch(0.98_0.02_85/0.85)_50%,transparent_58%)] animate-[slash-sweep_0.55s_ease-out]"
                  style={{ filter: "blur(2px)" }}
                />
                <div className="absolute inset-0 animate-[slash-sweep_0.55s_ease-out_0.05s] rounded-full bg-[linear-gradient(125deg,transparent_45%,oklch(0.8_0.15_80/0.9)_50%,transparent_55%)]" />
              </div>
            </div>
          ) : null}

          {/* 第三击：全屏暴击闪 + 中心爆炸圆 */}
          {critFlash ? (
            <>
              <div
                className="pointer-events-none absolute inset-0 z-30 bg-primary/70 mix-blend-screen animate-[crit-flash_0.6s_ease-out]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-[68%] top-[42%] z-30 size-32 rounded-full bg-[radial-gradient(circle,oklch(0.95_0.15_80/0.95)_0%,oklch(0.7_0.18_35/0.6)_40%,transparent_70%)] animate-[crit-burst_0.7s_ease-out]"
                aria-hidden
              />
            </>
          ) : null}

          {/* 飞起的伤害数字（每个挂在中央偏右，对应 Boss 位置） */}
          {damages.map((d) => (
            <div
              key={d.id}
              className={cn(
                "pointer-events-none absolute z-30 left-[68%] top-[36%] -translate-x-1/2 font-serif font-bold animate-[dmg-float_1.2s_ease-out_forwards]",
                d.critical
                  ? "text-3xl text-chart-5 drop-shadow-[0_0_12px_oklch(0.7_0.18_35/0.9)] sm:text-5xl"
                  : "text-2xl text-foreground drop-shadow-[0_0_8px_oklch(0_0_0/0.9)] sm:text-4xl",
              )}
              aria-hidden
            >
              {d.critical
                ? interpolate(b.dmgCrit, { n: String(d.amount) })
                : interpolate(b.dmgHit, { n: String(d.amount) })}
            </div>
          ))}

          {/* 战斗中状态条 — intro / attack 阶段 */}
          {!bossDefeated ? (
            <div className="absolute bottom-3 right-3 z-10 sm:bottom-6 sm:right-6">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 font-mono text-[10px] backdrop-blur sm:px-3 sm:py-2 sm:text-xs">
                <Zap className="size-3 text-chart-2" aria-hidden />
                <span className="text-muted-foreground">{b.teamPower}</span>
                <span className="text-primary">{teamPower}</span>
              </div>
            </div>
          ) : null}

          {/* PENDING — 等待钱包确认 / 上链中 */}
          {isPending ? (
            <div
              className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm"
              role="status"
              aria-live="polite"
            >
              <div className="flex size-16 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/10 ring-rune">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                  {b.pendingMicro}
                </p>
                <p className="mt-1 font-serif text-xl text-glow-gold sm:text-2xl">
                  {b.pendingHead}
                </p>
                <p className="mt-1 max-w-xs px-4 text-xs leading-relaxed text-muted-foreground">
                  {b.pendingHint}
                </p>
              </div>
            </div>
          ) : null}

          {/* FAILED — 出征失败（用户拒签 / 链上 revert） */}
          {isFailed ? (
            <div
              className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm"
              role="alert"
            >
              <div className="flex size-16 items-center justify-center rounded-full border-2 border-chart-5/60 bg-chart-5/10">
                <AlertTriangle className="size-8 text-chart-5" aria-hidden />
              </div>
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                  {b.failedMicro}
                </p>
                <p className="mt-1 font-serif text-xl text-foreground sm:text-2xl">
                  {b.failedTitle}
                </p>
                {errorMessage ? (
                  <p className="mx-auto mt-2 max-w-sm px-4 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {errorMessage}
                  </p>
                ) : (
                  <p className="mt-1 max-w-xs px-4 text-xs leading-relaxed text-muted-foreground">
                    {b.failedDefault}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* VICTORY 横幅 — 击杀 BOSS */}
          {isVictory ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-40 animate-[victory-pop_0.6s_cubic-bezier(.4,1.6,.5,1)_forwards]"
              aria-hidden
            >
              <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-background/85 px-5 py-3 backdrop-blur-md ring-rune sm:px-7 sm:py-4">
                <Trophy className="size-7 text-primary sm:size-9" aria-hidden />
                <div className="flex flex-col leading-tight">
                  <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground sm:text-xs">
                    {b.victoryMicro}
                  </span>
                  <span className="font-serif text-xl text-glow-gold sm:text-3xl">
                    {b.victoryTitle}
                  </span>
                  <span className="mt-0.5 font-mono text-[10px] text-chart-2 sm:text-[11px]">
                    {interpolate(b.victorySub, { boss: dLoc.bossName })}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* DEFEAT 横幅 — 队伍被 BOSS 击杀 */}
          {isDefeat ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-40 animate-[victory-pop_0.6s_cubic-bezier(.4,1.6,.5,1)_forwards]"
              aria-hidden
            >
              <div className="flex items-center gap-3 rounded-xl border-2 border-chart-5 bg-background/90 px-5 py-3 backdrop-blur-md sm:px-7 sm:py-4">
                <Skull className="size-7 text-chart-5 sm:size-9" aria-hidden />
                <div className="flex flex-col leading-tight">
                  <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground sm:text-xs">
                    {b.defeatMicro}
                  </span>
                  <span className="font-serif text-xl text-chart-5 sm:text-3xl">
                    {b.defeatTitle}
                  </span>
                  <span className="mt-0.5 font-mono text-[10px] text-muted-foreground sm:text-[11px]">
                    {interpolate(b.defeatSub, { boss: dLoc.bossName })}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* 底部：根据阶段切换 — pending / failed / battling / victory */}
        <div className="border-t border-border/60 bg-background/85 backdrop-blur">
          {isPending ? (
            <div className="flex items-center justify-between gap-3 p-4 text-xs sm:p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                <span className="font-mono uppercase tracking-widest">
                  {b.footerPending}
                </span>
              </div>
              <p className="hidden font-mono text-[10px] text-muted-foreground sm:block">
                {b.footerPendingHint}
              </p>
            </div>
          ) : isFailed ? (
            <div className="flex flex-col items-stretch gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="size-4 text-chart-5" aria-hidden />
                <span className="font-mono uppercase tracking-widest text-muted-foreground">
                  {b.failedMicro}
                </span>
              </div>
              <Button variant="outline" onClick={onClose} className="gap-2">
                <X className="size-4" aria-hidden />
                {b.close}
              </Button>
            </div>
          ) : battleEnded ? (
            <div className="flex flex-col gap-3 p-4 sm:p-5 animate-[loot-rise_0.5s_ease-out]">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {isVictory ? b.lootWin : b.lootLose}
                </p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-mono text-[10px]",
                    isVictory
                      ? "border-primary/50 bg-primary/10 text-chart-2"
                      : "border-chart-5/50 bg-chart-5/10 text-chart-5",
                  )}
                >
                  {isVictory ? b.dropFull : b.dropQuarter}
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MATERIAL_KEYS.map((k) => {
                  const v = lootDrops[k]
                  const hasDrop = v > 0
                  return (
                    <li
                      key={k}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                        hasDrop
                          ? isVictory
                            ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_oklch(0.8_0.15_80/0.15)]"
                            : "border-chart-5/40 bg-chart-5/5"
                          : "border-border/40 bg-background/40 opacity-40",
                      )}
                    >
                      <MaterialIcon material={k} size="sm" />
                      <div className="ml-auto flex items-baseline gap-1">
                        <span
                          className={cn(
                            "font-mono text-base font-semibold leading-none",
                            isVictory ? "text-primary" : "text-foreground",
                          )}
                        >
                          +{v.toFixed(v % 1 === 0 ? 0 : 1)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Hourglass className="size-3" aria-hidden />
                  {isVictory ? b.cdWin : b.cdLose}
                </p>
                <Button
                  onClick={onClose}
                  className={cn(
                    "gap-2",
                    !isVictory && "bg-chart-5 text-background hover:bg-chart-5/90",
                  )}
                >
                  <Hourglass className="size-4" aria-hidden />
                  {b.claimCd}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-4 text-xs sm:p-5">
              <div className="flex items-center gap-2">
                <Shield
                  className={cn(
                    "size-4 transition-colors",
                    phase === "intro" ? "text-muted-foreground" : "text-chart-2",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "font-mono uppercase tracking-widest",
                    phase === "attack3" && willFail
                      ? "text-chart-5"
                      : "text-muted-foreground",
                  )}
                >
                  {phase === "intro"
                    ? b.phaseIntro
                    : phase === "attack1"
                      ? b.phase1
                      : phase === "attack2"
                        ? b.phase2
                        : willFail
                          ? b.phaseBoss
                          : b.phaseCrit}
                </span>
              </div>
              {/* 进度刻度 */}
              <div className="flex items-center gap-1">
                {(["attack1", "attack2", "attack3"] as Phase[]).map((p, i) => {
                  const ph = phase as string
                  const done =
                    ph === "victory" ||
                    (ph === "attack1" && i === 0) ||
                    (ph === "attack2" && i <= 1) ||
                    (ph === "attack3" && i <= 2)
                  return (
                    <span
                      key={p}
                      className={cn(
                        "h-1.5 w-6 rounded-full transition-colors",
                        done ? "bg-primary shadow-[0_0_8px_oklch(0.8_0.15_80/0.7)]" : "bg-border",
                      )}
                      aria-hidden
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
