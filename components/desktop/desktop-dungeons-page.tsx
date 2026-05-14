"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Skull,
  Sword,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { TopBar } from "@/components/game/top-bar"
import { MaterialIcon } from "@/components/game/material-icon"
import { BattleModal } from "@/components/game/battle-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { mergeLocalizedDungeon } from "@/lib/i18n/game-display"
import { DUNGEONS, ENERGY_PRICE_USDT, MATERIAL_KEYS } from "@/lib/game-data"

export function DesktopDungeonsPage() {
  const { messages: loc } = useLocale()
  const dun = loc.game.dungeons
  const tm = loc.game.teams
  const s = loc.game.shared
  const priceStr = String(ENERGY_PRICE_USDT)

  const {
    connected,
    connect,
    energy,
    teams,
    characters,
    challenge,
    buyEnergy,
    usdt,
    isUsdtApprovedForStamina,
    approveUsdtForStamina,
    isTxPending,
  } = useGame()

  const [target, setTarget] = React.useState<number | null>(null)
  const [buyOpen, setBuyOpen] = React.useState(false)
  const [buyAmount, setBuyAmount] = React.useState(10)

  /**
   * 战斗 modal 状态。
   *
   * 流程：用户在选队对话框点"派出某队伍" → 立即关掉选队对话框，
   * 打开 BattleModal 进入 `submitting` 阶段；同步 await `challenge(teamId, level)`：
   *   - 链上成功 → 切到 `success`，BattleModal 启动战斗动画时间线
   *   - 链上失败 / 用户拒签 → 切到 `failed`，BattleModal 显示"出征失败"+ 错误
   * 不再有"先动画后签名"的颠倒流程，也不再需要"领取战利品"二次按钮。
   */
  const [battle, setBattle] = React.useState<{
    teamId: string
    dungeonLevel: number
    txStatus: "submitting" | "success" | "failed"
    errorMessage?: string
    /** 链上事件解析结果 — 决定胜利/失败动效与实际掉落 */
    result?: import("@/components/providers/game-provider").ChallengeResult | null
  } | null>(null)

  const charById = React.useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters])
  const teamPower = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (!team) return 0
    return team.characterIds.reduce(
      (sum, id) => sum + (charById.get(id)?.power ?? 0),
      0,
    )
  }

  const targetDungeon = DUNGEONS.find((d) => d.level === target) ?? null

  const eligibleTeams = teams.filter((t) => {
    if (!targetDungeon) return false
    if (t.cooldownUntil > Date.now()) return false
    return teamPower(t.id) >= targetDungeon.minPower
  })

  const handleChallenge = async (teamId: string) => {
    if (!target) return
    const dungeonLevel = target
    setTarget(null)
    setBattle({ teamId, dungeonLevel, txStatus: "submitting" })

    try {
      // challenge 现在返回 { ok, result }：
      // - ok=true + result：tx 上链 + 事件已解析 → "success"，由 result.success 驱动 victory/defeat 动效
      // - ok=true + result=null：tx 上链但事件解析失败（极少）→ 仍走"success"，BattleModal 用副本默认掉落 fallback
      // - ok=false：用户拒签 / tx revert → "failed"
      const { ok, result } = await challenge(teamId, dungeonLevel)
      setBattle((prev) =>
        prev
          ? {
              ...prev,
              txStatus: ok ? "success" : "failed",
              errorMessage: ok ? undefined : s.txRejected,
              result,
            }
          : prev,
      )
    } catch (err) {
      const msg = (err as Error)?.message ?? s.unknownError
      setBattle((prev) =>
        prev ? { ...prev, txStatus: "failed", errorMessage: msg } : prev,
      )
    }
  }

  const battleDungeon = battle
    ? DUNGEONS.find((d) => d.level === battle.dungeonLevel) ?? null
    : null
  const battleTeam = battle ? teams.find((t) => t.id === battle.teamId) ?? null : null
  const battleHeroes = battleTeam
    ? (battleTeam.characterIds
        .map((id) => characters.find((c) => c.id === id))
        .filter(Boolean) as typeof characters)
    : []

  const handleBuyEnergy = async () => {
    if (buyAmount <= 0) return
    if (!isUsdtApprovedForStamina) return
    const ok = await buyEnergy(buyAmount)
    if (ok) setBuyOpen(false)
  }

  const handleApproveUsdt = async () => {
    if (isTxPending) return
    await approveUsdtForStamina()
    // 授权成功后留在弹窗，让用户继续点"确认购买"，UI 会自动切换到下一步
  }

  return (
    <>
      <TopBar title={dun.title} description={dun.desc} />

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
            {/* Energy bar */}
            <Card className="border-border bg-card/60">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex size-12 items-center justify-center rounded-lg border border-chart-2/40 bg-chart-2/10 text-chart-2">
                    <Zap className="size-6" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {dun.energyTag}
                    </p>
                    <p className="font-serif text-2xl">
                      {interpolate(dun.energyRow, { n: String(energy) })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <p className="order-2 text-[11px] text-muted-foreground sm:order-1 sm:text-xs">
                    {interpolate(dun.priceLine, { price: priceStr })}
                  </p>
                  <Button
                    onClick={() => setBuyOpen(true)}
                    className="order-1 ml-auto gap-2 sm:order-2 sm:ml-0"
                    size="sm"
                  >
                    <Plus className="size-4" aria-hidden />
                    {dun.buyEnergy}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dungeon grid */}
            <section>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {dun.sectionLabel}
              </p>
              <h2 className="font-serif text-2xl">{dun.sixTiers}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{dun.rules}</p>

              <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {DUNGEONS.map((d) => {
                  const dl = mergeLocalizedDungeon(loc.game, d)
                  const eligible = teams.some(
                    (t) =>
                      t.cooldownUntil <= Date.now() &&
                      teamPower(t.id) >= d.minPower,
                  )
                  return (
                    <li key={d.level}>
                      <Card className="group h-full overflow-hidden border-border bg-card/60 p-0">
                        <div className="relative aspect-[16/10] w-full overflow-hidden">
                          <Image
                            src={d.image || "/placeholder.svg"}
                            alt={interpolate(dun.sceneAlt, { name: dl.name })}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
                          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
                            <p className="rounded-md border border-primary/40 bg-background/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary backdrop-blur">
                              Dungeon {d.level}
                            </p>
                            <Badge
                              variant={eligible ? "default" : "secondary"}
                              className="font-mono backdrop-blur"
                            >
                              {interpolate(s.powerGte, { n: String(d.minPower) })}
                            </Badge>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <h3 className="font-serif text-2xl text-balance text-foreground drop-shadow-lg">
                              {dl.name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Skull className="size-3.5 text-chart-5" aria-hidden />
                              <span>
                                {interpolate(dun.bossLine, { name: dl.bossName })}
                              </span>
                            </p>
                          </div>
                        </div>

                        <CardContent className="flex flex-col gap-4 p-5">
                          <p className="text-[12px] leading-relaxed text-muted-foreground text-pretty">
                            {dl.description}
                          </p>

                          <ul className="grid grid-cols-2 gap-2">
                            {MATERIAL_KEYS.map((k) => {
                              const v = d.output[k]
                              return (
                                <li
                                  key={k}
                                  className={`flex items-center justify-between rounded-lg border p-2 ${
                                    v > 0
                                      ? "border-border bg-background/40"
                                      : "border-border/40 bg-background/20 opacity-40"
                                  }`}
                                >
                                  <MaterialIcon material={k} size="sm" />
                                  <span className="font-mono text-sm">+{v}</span>
                                </li>
                              )
                            })}
                          </ul>

                          <Button
                            className="gap-2"
                            disabled={energy < 1 || !eligible}
                            onClick={() => setTarget(d.level)}
                          >
                            <Sword className="size-4" aria-hidden />
                            {dun.challenge}
                          </Button>

                          {!eligible ? (
                            <p className="text-[11px] text-muted-foreground">
                              {dun.gateClosed}
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        )}
      </main>

      {/* Choose team dialog */}
      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {interpolate(dun.pickTeamTitle, {
                name: targetDungeon
                  ? mergeLocalizedDungeon(loc.game, targetDungeon).name
                  : "",
              })}
            </DialogTitle>
            <DialogDescription>
              {targetDungeon
                ? interpolate(dun.pickTeamHint, {
                    power: String(targetDungeon.minPower),
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          {eligibleTeams.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{dun.noTeamsTitle}</EmptyTitle>
                <EmptyDescription>{dun.noTeamsDesc}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/game/teams">{dun.goTeams}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {eligibleTeams.map((team) => (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => handleChallenge(team.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background/40 p-4 text-left transition hover:border-primary/40 hover:bg-card"
                  >
                    <div>
                      <div className="font-serif text-base">{team.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {team.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {tm.totalPower}
                      </div>
                      <div className="font-mono text-xl text-primary">
                        {teamPower(team.id)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Battle modal — 链上 tx 状态 + DungeonResult 事件共同驱动：
          pending → success(动画) → victory(全额掉落) / defeat(1/4 掉落) / failed(tx 失败) */}
      <BattleModal
        open={!!battle}
        onClose={() => setBattle(null)}
        dungeon={battleDungeon}
        characters={battleHeroes}
        txStatus={battle?.txStatus ?? null}
        errorMessage={battle?.errorMessage}
        result={battle?.result ?? null}
      />

      {/* Buy energy dialog */}
      <Dialog
        open={buyOpen}
        onOpenChange={(o) => {
          if (!isTxPending) setBuyOpen(o)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{dun.buyTitle}</DialogTitle>
            <DialogDescription>
              {interpolate(dun.buyLead, { price: priceStr })}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="energy-amount">{s.qty}</FieldLabel>
              <Input
                id="energy-amount"
                type="number"
                min={1}
                value={buyAmount}
                onChange={(e) => setBuyAmount(Math.max(1, parseInt(e.target.value) || 0))}
                disabled={isTxPending}
              />
            </Field>
          </FieldGroup>

          {/* 两步进度指示：授权 USDT → 购买体力 */}
          <ol className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em]">
            <li
              className={cn(
                "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 transition",
                isUsdtApprovedForStamina
                  ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                  : "border-primary/50 bg-primary/10 text-primary",
              )}
            >
              {isUsdtApprovedForStamina ? (
                <ShieldCheck className="size-3.5" aria-hidden />
              ) : (
                <KeyRound className="size-3.5" aria-hidden />
              )}
              <span>{dun.step1}</span>
            </li>
            <li className="text-muted-foreground" aria-hidden>
              →
            </li>
            <li
              className={cn(
                "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 transition",
                isUsdtApprovedForStamina
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/30 text-muted-foreground",
              )}
            >
              <Zap className="size-3.5" aria-hidden />
              <span>{dun.step2}</span>
            </li>
          </ol>

          <div className="rounded-lg border border-border bg-background/40 p-4 text-sm">
            <Row
              label={s.payTotal}
              value={`${(buyAmount * ENERGY_PRICE_USDT).toFixed(2)} USDT`}
              highlight
            />
            <Row label={s.rowCurrentUsdt} value={usdt.toFixed(2)} />
            <Row
              label={s.referralShareRow}
              value={`${(buyAmount * ENERGY_PRICE_USDT * 0.15).toFixed(3)} USDT`}
              muted
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBuyOpen(false)}
              disabled={isTxPending}
            >
              {s.cancel}
            </Button>
            {isUsdtApprovedForStamina ? (
              <Button
                onClick={handleBuyEnergy}
                disabled={
                  usdt < buyAmount * ENERGY_PRICE_USDT || buyAmount < 1 || isTxPending
                }
                className="gap-2"
              >
                {isTxPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Zap className="size-4" aria-hidden />
                )}
                {isTxPending ? s.submitting : s.confirmBuy}
              </Button>
            ) : (
              <Button onClick={handleApproveUsdt} disabled={isTxPending} className="gap-2">
                {isTxPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <KeyRound className="size-4" aria-hidden />
                )}
                {isTxPending ? s.authorizing : s.authorizeUsdt}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Row({
  label,
  value,
  highlight,
  muted,
}: {
  label: string
  value: string
  highlight?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono ${
          highlight ? "text-primary font-semibold" : muted ? "text-muted-foreground" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
