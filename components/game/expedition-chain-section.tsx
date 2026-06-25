"use client"

import * as React from "react"
import { Link2, Loader2, Sword } from "lucide-react"

import { ClassAffinityBadge } from "@/components/game/class-affinity-badge"
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
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { DUNGEONS } from "@/lib/game-data"

const DEFAULT_CHAIN = [1, 2, 3]

export function ExpeditionChainSection() {
  const { messages: loc } = useLocale()
  const d = loc.game.dungeons
  const s = loc.game.shared
  const {
    teams,
    characters,
    energy,
    expeditionChainSteps,
    expeditionChainExtraStamina,
    expeditionChainMaterialBps,
    expeditionChainStates,
    challengeExpeditionChain,
    isTxPending,
    connected,
  } = useGame()

  const [pickOpen, setPickOpen] = React.useState(false)
  const [levels, setLevels] = React.useState<number[]>(DEFAULT_CHAIN)
  const [battle, setBattle] = React.useState<{
    teamId: string
    dungeonLevel: number
    txStatus: "submitting" | "success" | "failed"
    errorMessage?: string
    result?: import("@/components/providers/game-provider").ChallengeResult | null
  } | null>(null)

  const charById = React.useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters])
  const teamPower = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (!team) return 0
    return team.characterIds.reduce((sum, id) => sum + (charById.get(id)?.power ?? 0), 0)
  }

  const activeChain = expeditionChainStates.find((c) => c.step > 0 && c.step < expeditionChainSteps)
  const activeTeamIndex = activeChain
    ? expeditionChainStates.findIndex((c) => c.step > 0 && c.step < expeditionChainSteps)
    : -1

  const matPct = ((expeditionChainMaterialBps - 10_000) / 100).toFixed(0)
  const firstStamina = 1 + expeditionChainExtraStamina

  const eligibleTeams = teams.filter((t) => {
    const idx = Number(t.id)
    const chain = expeditionChainStates[idx]
    if (chain && chain.step > 0 && chain.step < expeditionChainSteps) {
      return t.cooldownUntil <= Date.now()
    }
    return (
      t.cooldownUntil <= Date.now() &&
      levels.every((lvl) => teamPower(t.id) >= (DUNGEONS.find((x) => x.level === lvl)?.minPower ?? 999))
    )
  })

  const runChainStep = async (teamId: string) => {
    setPickOpen(false)
    const chain = expeditionChainStates[Number(teamId)]
    const step = chain?.step ?? 0
    const dungeonLevel = levels[step] ?? levels[0]!
    setBattle({ teamId, dungeonLevel, txStatus: "submitting" })
    try {
      const { ok, result } = await challengeExpeditionChain(teamId, levels)
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
      setBattle((prev) =>
        prev
          ? { ...prev, txStatus: "failed", errorMessage: (err as Error)?.message ?? s.unknownError }
          : prev,
      )
    }
  }

  if (!connected) return null

  const battleDungeon = battle ? DUNGEONS.find((x) => x.level === battle.dungeonLevel) ?? null : null
  const battleTeam = battle ? teams.find((t) => t.id === battle.teamId) ?? null : null
  const battleHeroes = battleTeam
    ? (battleTeam.characterIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean) as typeof characters)
    : []

  return (
    <>
      <Card className="border-primary/25 bg-gradient-to-br from-primary/5 via-card/60 to-card/40">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-primary">{d.expeditionEyebrow}</p>
            <h3 className="font-serif text-lg">{d.expeditionTitle}</h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {interpolate(d.expeditionDesc, {
                steps: String(expeditionChainSteps),
                stamina: String(firstStamina),
                pct: matPct,
              })}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {levels.slice(0, expeditionChainSteps).map((lvl, i) => (
                <Badge key={i} variant="outline" className="font-mono text-[10px]">
                  {i + 1}. D{lvl}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {activeTeamIndex >= 0 ? (
              <p className="text-xs text-muted-foreground">
                {interpolate(d.expeditionActive, {
                  team: String(activeTeamIndex + 1),
                  step: String(expeditionChainStates[activeTeamIndex]?.step ?? 0),
                  total: String(expeditionChainSteps),
                })}
              </p>
            ) : null}
            <Button
              className="gap-2"
              disabled={isTxPending || energy < (activeTeamIndex >= 0 ? 0 : firstStamina)}
              onClick={() => setPickOpen(true)}
            >
              {isTxPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
              {activeTeamIndex >= 0 ? d.expeditionContinue : d.expeditionStart}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{d.expeditionPickTeam}</DialogTitle>
            <DialogDescription>{d.expeditionPickHint}</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2">
            {eligibleTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">{d.noTeamsDesc}</p>
            ) : (
              eligibleTeams.map((team) => {
                const members = team.characterIds
                  .map((id) => charById.get(id))
                  .filter(Boolean) as typeof characters
                const nextLvl = levels[expeditionChainStates[Number(team.id)]?.step ?? 0] ?? levels[0]!
                return (
                  <li key={team.id}>
                    <button
                      type="button"
                      onClick={() => runChainStep(team.id)}
                      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-background/40 p-4 text-left transition hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif">{team.name}</span>
                        <span className="font-mono text-primary">{teamPower(team.id)}</span>
                      </div>
                      <ClassAffinityBadge members={members} dungeonLevel={nextLvl} />
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickOpen(false)}>
              {s.cancel}
            </Button>
          </DialogFooter>
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
    </>
  )
}
