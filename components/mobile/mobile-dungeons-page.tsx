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
import { MaterialIcon } from "@/components/game/material-icon"
import { BattleModal } from "@/components/game/battle-modal"
import { ClassAffinityBadge } from "@/components/game/class-affinity-badge"
import { ExpeditionChainSection } from "@/components/game/expedition-chain-section"
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
import { DUNGEONS, DUNGEON_SPECIALIST, ENERGY_PRICE_USDT, MATERIAL_KEYS } from "@/lib/game-data"
import { MobilePageHeader } from "./mobile-shell"

export function MobileDungeonsPage() {
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

  const [battle, setBattle] = React.useState<{
    teamId: string
    dungeonLevel: number
    txStatus: "submitting" | "success" | "failed"
    errorMessage?: string
    result?: import("@/components/providers/game-provider").ChallengeResult | null
  } | null>(null)

  const charById = React.useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters],
  )
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
  const battleTeam = battle
    ? teams.find((t) => t.id === battle.teamId) ?? null
    : null
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
  }

  return (
    <>
      <MobilePageHeader title={dun.title} description={dun.desc} />

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
            {/* Energy bar */}
            <Card className="border-border bg-card/60">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-chart-2/40 bg-chart-2/10 text-chart-2">
                    <Zap className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {dun.energyTag}
                    </p>
                    <p className="font-serif text-xl leading-none">
                      {interpolate(dun.energyRow, { n: String(energy) })}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setBuyOpen(true)}
                  className="h-9 gap-1.5"
                  size="sm"
                >
                  <Plus className="size-3.5" aria-hidden />
                  {dun.buyEnergyShort}
                </Button>
              </CardContent>
            </Card>

            <ExpeditionChainSection />

            {/* Dungeon list - vertical stack on mobile */}
            <section>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {dun.sectionLabel}
              </p>
              <h2 className="font-serif text-xl">{dun.sixTiers}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{dun.rulesMobile}</p>
              <p className="mt-2 rounded-lg border border-chart-5/30 bg-chart-5/5 px-3 py-2 text-[11px] text-muted-foreground">
                {dun.d6Warning}
              </p>

              <ul className="mt-3 flex flex-col gap-3">
                {DUNGEONS.map((d) => {
                  const dl = mergeLocalizedDungeon(loc.game, d)
                  const eligible = teams.some(
                    (t) =>
                      t.cooldownUntil <= Date.now() &&
                      teamPower(t.id) >= d.minPower,
                  )
                  return (
                    <li key={d.level}>
                      <Card className="overflow-hidden border-border bg-card/60 p-0">
                        <div className="relative aspect-[16/9] w-full overflow-hidden">
                          <Image
                            src={d.image || "/placeholder.svg"}
                            alt={interpolate(dun.sceneAlt, { name: d.name })}
                            fill
                            sizes="100vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
                          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                            <p className="rounded-md border border-primary/40 bg-background/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary backdrop-blur">
                              D{d.level}
                            </p>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className="font-mono text-[9px] backdrop-blur">
                                {DUNGEON_SPECIALIST[d.level] === "HIGH_AB"
                                  ? "AE/BF"
                                  : DUNGEON_SPECIALIST[d.level] === "MIXED"
                                    ? "混合"
                                    : `${DUNGEON_SPECIALIST[d.level]} 专产`}
                              </Badge>
                              <Badge
                                variant={eligible ? "default" : "secondary"}
                                className="font-mono text-[10px] backdrop-blur"
                              >
                                {interpolate(s.powerGte, { n: String(d.minPower) })}
                              </Badge>
                            </div>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <h3 className="font-serif text-lg leading-tight text-foreground drop-shadow-lg">
                              {dl.name}
                            </h3>
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Skull
                                className="size-3 text-chart-5"
                                aria-hidden
                              />
                              <span>
                                {interpolate(dun.bossLine, { name: dl.bossName })}
                              </span>
                            </p>
                          </div>
                        </div>

                        <CardContent className="flex flex-col gap-3 p-4">
                          <p className="text-[11px] leading-relaxed text-muted-foreground text-pretty line-clamp-2">
                            {dl.description}
                          </p>

                          <ul className="grid grid-cols-4 gap-1.5">
                            {MATERIAL_KEYS.map((k) => {
                              const v = d.output[k]
                              return (
                                <li
                                  key={k}
                                  className={`flex items-center gap-1 rounded-md border p-1.5 ${
                                    v > 0
                                      ? "border-border bg-background/40"
                                      : "border-border/40 bg-background/20 opacity-40"
                                  }`}
                                >
                                  <MaterialIcon material={k} size="sm" />
                                  <span className="font-mono text-[11px]">
                                    +{v}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>

                          <Button
                            className="h-10 gap-2"
                            disabled={energy < 1 || !eligible}
                            onClick={() => setTarget(d.level)}
                          >
                            <Sword className="size-4" aria-hidden />
                            {dun.challenge}
                          </Button>

                          {!eligible ? (
                            <p className="text-[10px] text-muted-foreground">
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
      <Dialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
      >
        <DialogContent
          className="max-w-[92vw]"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-base">
              {interpolate(dun.pickTeamTitle, {
                name: targetDungeon
                  ? mergeLocalizedDungeon(loc.game, targetDungeon).name
                  : "",
              })}
            </DialogTitle>
            <DialogDescription className="text-xs">
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
                <EmptyDescription>{dun.noTeamsDescShort}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/game/teams">{dun.goTeams}</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {eligibleTeams.map((team) => {
                const members = team.characterIds
                  .map((id) => charById.get(id))
                  .filter(Boolean) as typeof characters
                return (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => handleChallenge(team.id)}
                    className="flex w-full flex-col gap-2 rounded-lg border border-border bg-background/40 p-3 text-left transition hover:border-primary/40 hover:bg-card"
                  >
                    <div className="flex w-full items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-serif text-sm truncate">
                        {team.name}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {team.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                        {tm.estPowerShort}
                      </div>
                      <div className="font-mono text-lg text-primary leading-none">
                        {teamPower(team.id)}
                      </div>
                    </div>
                    </div>
                    {targetDungeon ? (
                      <ClassAffinityBadge members={members} dungeonLevel={targetDungeon.level} />
                    ) : null}
                  </button>
                </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

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
        <DialogContent className="max-w-[92vw]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-serif text-base">{dun.buyTitle}</DialogTitle>
            <DialogDescription className="text-xs">
              {interpolate(dun.buyLead, { price: priceStr })}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="m-energy-amount">{s.qty}</FieldLabel>
              <Input
                id="m-energy-amount"
                type="number"
                min={1}
                value={buyAmount}
                onChange={(e) =>
                  setBuyAmount(Math.max(1, parseInt(e.target.value) || 0))
                }
                disabled={isTxPending}
              />
            </Field>
          </FieldGroup>

          {/* 两步进度指示 */}
          <ol className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]">
            <li
              className={cn(
                "flex flex-1 items-center gap-1.5 rounded-md border px-2 py-1.5 transition",
                isUsdtApprovedForStamina
                  ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                  : "border-primary/50 bg-primary/10 text-primary",
              )}
            >
              {isUsdtApprovedForStamina ? (
                <ShieldCheck className="size-3" aria-hidden />
              ) : (
                <KeyRound className="size-3" aria-hidden />
              )}
              <span>{dun.energyStep1Short}</span>
            </li>
            <li className="text-muted-foreground" aria-hidden>
              →
            </li>
            <li
              className={cn(
                "flex flex-1 items-center gap-1.5 rounded-md border px-2 py-1.5 transition",
                isUsdtApprovedForStamina
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/30 text-muted-foreground",
              )}
            >
              <Zap className="size-3" aria-hidden />
              <span>{dun.energyStep2Short}</span>
            </li>
          </ol>

          <div className="rounded-lg border border-border bg-background/40 p-3 text-xs">
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

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setBuyOpen(false)}
              disabled={isTxPending}
              className="flex-1"
            >
              {s.cancel}
            </Button>
            {isUsdtApprovedForStamina ? (
              <Button
                onClick={handleBuyEnergy}
                disabled={
                  usdt < buyAmount * ENERGY_PRICE_USDT ||
                  buyAmount < 1 ||
                  isTxPending
                }
                className="flex-1 gap-2"
              >
                {isTxPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Zap className="size-4" aria-hidden />
                )}
                {isTxPending ? s.submitting : s.confirm}
              </Button>
            ) : (
              <Button
                onClick={handleApproveUsdt}
                disabled={isTxPending}
                className="flex-1 gap-2"
              >
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
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono ${
          highlight
            ? "text-primary font-semibold"
            : muted
              ? "text-muted-foreground"
              : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
