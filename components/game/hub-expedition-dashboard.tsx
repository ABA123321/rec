"use client"

import Link from "next/link"
import { CalendarDays, Compass, FlaskConical, Sparkles, Target, Users } from "lucide-react"

import { MaterialIcon } from "@/components/game/material-icon"
import { HubNewbieMaterialHint } from "@/components/game/hub-newbie-material-hint"
import { HubResonancePanel } from "@/components/game/hub-resonance-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import {
  DUNGEONS,
  DUNGEON_SPECIALIST,
  MATERIAL_KEYS,
  SEVEN_DAY_ROUTE,
  synthesisProgress,
  type MaterialKey,
  type RarityLevel,
} from "@/lib/game-data"
import { materialKeyFromId } from "@/lib/web3/reads"
import { interpolate } from "@/lib/i18n/interpolate"

function specialistLabel(key: string): string {
  if (key === "HIGH_AB") return "AE/BF"
  if (key === "MIXED") return "混合"
  return key
}

export function HubExpeditionDashboard() {
  const { messages: m } = useLocale()
  const h = m.hub
  const {
    inventory,
    teams,
    progressState,
    claimDailySpecialistReward,
    isTxPending,
  } = useGame()

  const synthTarget: RarityLevel = 1
  const prog = synthesisProgress(inventory, synthTarget)
  const idleTeams = teams.filter((t) => t.cooldownUntil <= Date.now()).length

  const dailyDone = progressState
    ? (progressState.dailySpecialistMask & 0x0f) === 0x0f
    : false
  const dailyClaimable =
    progressState != null && dailyDone && !progressState.dailySpecialistClaimed

  const weeklyActive =
    progressState != null &&
    progressState.weeklyBonusEndsAt * 1000 > Date.now() &&
    progressState.weeklyBonusBps > 0
  const weeklyMat = weeklyActive
    ? materialKeyFromId(progressState!.weeklyBonusMaterialId)
    : null

  const dayIndex = Math.min(
    6,
    Math.max(0, Math.floor((Date.now() - Date.UTC(2026, 5, 1)) / (86400000 * 7))),
  )
  const routeDay = SEVEN_DAY_ROUTE[dayIndex]!

  return (
    <div className="flex flex-col gap-4">
      <HubNewbieMaterialHint />
      <section className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border bg-card/60 lg:col-span-2">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{h.dashboardEyebrow}</p>
              <h2 className="font-serif text-xl">{h.dashboardTitle}</h2>
            </div>
            <Compass className="size-5 text-primary" aria-hidden />
          </div>

          <div className="mb-4 rounded-lg border border-border/60 bg-background/40 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FlaskConical className="size-4 text-primary" aria-hidden />
                {interpolate(h.synthProgressTitle, { level: String(synthTarget) })}
              </span>
              <span className="font-mono text-primary">{Math.round(prog.pct)}%</span>
            </div>
            <Progress value={prog.pct} className="mb-3 h-2" />
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MATERIAL_KEYS.map((k) => (
                <li key={k} className="rounded-md border border-border/50 px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    <MaterialIcon material={k} size="sm" />
                    <span className="font-mono">
                      {inventory[k].toLocaleString()} / {prog.cost[k]}
                    </span>
                  </div>
                  {prog.missing[k] > 0 ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {interpolate(h.missingRuns, {
                        n: String(
                          prog.recommendDungeons.find((d) => DUNGEONS.find((x) => x.level === d)?.output[k]) ?? 1,
                        ),
                        mat: k,
                      })}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {prog.recommendDungeons.map((lvl) => (
              <Badge key={lvl} variant="outline" className="gap-1 font-normal">
                <Target className="size-3" aria-hidden />
                D{lvl} · {specialistLabel(String(DUNGEON_SPECIALIST[lvl]))}
              </Badge>
            ))}
            <Badge variant="secondary" className="gap-1 font-normal">
              <Users className="size-3" aria-hidden />
              {interpolate(h.idleTeamsHint, { n: String(idleTeams) })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/60">
        <CardContent className="flex h-full flex-col gap-4 p-5 sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{h.tasksEyebrow}</p>
            <h2 className="font-serif text-xl">{h.tasksTitle}</h2>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
            <p className="mb-2 font-medium">{h.dailySpecialistTitle}</p>
            <div className="mb-2 flex gap-1">
              {[1, 2, 3, 4].map((d) => {
                const done = progressState ? (progressState.dailySpecialistMask & (1 << (d - 1))) !== 0 : false
                const tag = specialistLabel(String(DUNGEON_SPECIALIST[d]))
                return (
                  <span
                    key={d}
                    className={`flex-1 rounded px-1 py-1 text-center text-[10px] ${done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    D{d} {tag}
                  </span>
                )
              })}
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!dailyClaimable || isTxPending}
              onClick={claimDailySpecialistReward}
            >
              {dailyClaimable
                ? interpolate(h.claimDailyReward, {
                    n: String(progressState?.dailySpecialistReward ?? 2),
                  })
                : h.dailyIncomplete}
            </Button>
          </div>

          {weeklyActive && weeklyMat ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1 font-medium">
                <CalendarDays className="size-4 text-primary" aria-hidden />
                {h.weeklyCalendarTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {interpolate(h.weeklyCalendarDesc, {
                  dungeon: String(progressState!.weeklyBonusDungeon),
                  mat: weeklyMat,
                  bps: String(progressState!.weeklyBonusBps / 100),
                })}
              </p>
            </div>
          ) : null}

          {progressState && progressState.currentSeasonId > 0 ? (
            <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
              <p className="font-medium">{h.seasonTitle}</p>
              <p className="mt-1 font-mono text-primary">
                {Number(progressState.seasonScore / 10n).toLocaleString()} {h.seasonPoints}
              </p>
            </div>
          ) : null}

          <HubResonancePanel />

          <div className="mt-auto rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
            <p className="mb-1 flex items-center gap-1 font-medium">
              <Sparkles className="size-4 text-primary" aria-hidden />
              {interpolate(h.routeDayTitle, { day: String(routeDay.day) })}
            </p>
            <p className="text-xs font-serif text-foreground">{routeDay.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{routeDay.desc}</p>
            <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0">
              <Link href="/game/dungeons">{h.goDungeons}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
    </div>
  )
}
