"use client"

import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Gift,
  Map,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react"

import { GrassrootsTokenIcon } from "@/components/brand/grassroots-token-icon"
import { UsdtIcon } from "@/components/brand/usdt-icon"
import { TopBar } from "@/components/game/top-bar"
import { MaterialIcon } from "@/components/game/material-icon"
import { CharacterCard } from "@/components/game/character-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import {
  ENERGY_PRICE_USDT,
  MATERIAL_KEYS,
  SUMMON_TIER_SIZE,
  summonCapPhaseProgress,
  summonPhaseCostTotals,
} from "@/lib/game-data"
import { interpolate } from "@/lib/i18n/interpolate"
import { HubExpeditionDashboard } from "@/components/game/hub-expedition-dashboard"

/**
 * 主控台桌面端 —— 由原 app/game/page.tsx 抽取，未做功能修改。
 * 移动端等价实现见 components/mobile/mobile-hub-page.tsx。
 */
export function DesktopHubPage() {
  const { messages: m } = useLocale()
  const h = m.hub
  const {
    connected,
    connect,
    advent,
    usdt,
    energy,
    inventory,
    characters,
    teams,
    globalSummoned,
    charCap,
    currentSummonCost,
    newPlayerGiftClaimed,
    claimNewPlayerGift,
  } = useGame()

  const capPhase = summonCapPhaseProgress(globalSummoned, charCap)
  const phaseCost = summonPhaseCostTotals(
    capPhase.phaseFilled,
    capPhase.phaseSize,
    currentSummonCost,
  )
  const idleTeams = teams.filter((t) => t.cooldownUntil <= Date.now()).length

  const quickLinks = [
    { href: "/game/summon" as const, label: h.quickSummon, icon: Sparkles },
    { href: "/game/teams" as const, label: h.quickTeams, icon: Users },
    { href: "/game/dungeons" as const, label: h.quickDungeons, icon: Map },
    { href: "/game/synthesis" as const, label: h.quickSynthesis, icon: FlaskConical },
    { href: "/docs" as const, label: m.common.officialDocs, icon: BookOpen },
  ]

  return (
    <>
      <TopBar title={h.topBarTitle} description={h.topBarDesc} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {!connected ? (
          <Empty className="border border-dashed border-border bg-card/40">
            <EmptyHeader>
              <EmptyMedia>
                <span className="flex size-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary ring-rune">
                  <Sparkles className="size-7" aria-hidden />
                </span>
              </EmptyMedia>
              <EmptyTitle className="font-serif text-2xl">{h.connectTitle}</EmptyTitle>
              <EmptyDescription>{h.connectDesc}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={connect} size="lg" className="gap-2">
                <Sparkles className="size-4" aria-hidden />
                {h.connectCta}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            {!newPlayerGiftClaimed ? (
              <Card className="overflow-hidden border-primary/40 bg-gradient-to-br from-primary/12 via-card/60 to-card/40">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary ring-rune">
                      <Gift className="size-6" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-primary">
                        {h.giftEyebrow}
                      </p>
                      <h3 className="mt-1 font-serif text-lg sm:text-xl">{h.giftTitle}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {h.giftDescDesktop}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={claimNewPlayerGift}
                    size="lg"
                    className="w-full gap-2 sm:w-auto"
                  >
                    <Gift className="size-4" aria-hidden />
                    {h.giftClaim}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<GrassrootsTokenIcon size={16} title={null} />}
                label="$草根社"
                value={advent.toLocaleString()}
                hint={interpolate(h.statNextPull, {
                  cost: currentSummonCost.toLocaleString(),
                })}
              />
              <StatCard
                icon={<UsdtIcon size={16} title={null} />}
                label="USDT"
                value={usdt.toFixed(2)}
                hint={h.statUsdtHint}
              />
              <StatCard
                icon={<Zap className="size-4 text-chart-2" />}
                label={m.common.stamina}
                value={energy.toString()}
                hint={interpolate(h.statEnergyHint, { price: String(ENERGY_PRICE_USDT) })}
              />
              <StatCard
                icon={<Users className="size-4 text-primary" />}
                label={h.statRoster}
                value={`${characters.length} / ${teams.length}`}
                hint={interpolate(h.statIdleTeams, { n: String(idleTeams) })}
              />
            </section>

            <HubExpeditionDashboard />

            <section className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2 border-border bg-card/60">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {h.materialsEyebrow}
                      </p>
                      <h2 className="font-serif text-xl">{h.materialsTitle}</h2>
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link href="/game/market">
                        <Store className="size-3.5" aria-hidden />
                        {h.goMarket}
                      </Link>
                    </Button>
                  </div>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {MATERIAL_KEYS.map((k) => (
                      <li
                        key={k}
                        className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
                      >
                        <MaterialIcon material={k} showLabel size="sm" />
                        <span className="font-mono text-lg">
                          {inventory[k].toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 rounded-lg border border-border/60 bg-background/40 p-4">
                    <div className="mb-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">{h.globalMintDesktop}</span>
                      <span className="font-mono text-[11px] text-muted-foreground sm:text-xs">
                        {interpolate(h.phaseLineDesktop, {
                          phaseDisplay: String(capPhase.phaseDisplay),
                          phaseTotal: String(capPhase.phaseTotal),
                          spent: phaseCost.spent.toLocaleString(),
                          total: phaseCost.total.toLocaleString(),
                        })}
                      </span>
                    </div>
                    <div className="mb-2 flex items-baseline justify-between font-mono text-sm">
                      <span>
                        <span className="text-lg text-primary">
                          {capPhase.phaseFilled.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          / {capPhase.phaseSize.toLocaleString()}
                        </span>
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {interpolate(h.phaseHint, {
                          size: SUMMON_TIER_SIZE.toLocaleString(),
                        })}
                      </span>
                    </div>
                    <Progress value={capPhase.phasePct} className="h-2" />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {interpolate(h.summonHintDesktop, {
                        tier: SUMMON_TIER_SIZE.toLocaleString(),
                      })}
                      <span className="ml-1 font-mono text-primary">
                        {currentSummonCost.toLocaleString()} $草根社
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/60">
                <CardContent className="p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {h.quickEyebrow}
                  </p>
                  <h2 className="mt-1 font-serif text-xl">{h.quickTitle}</h2>

                  <ul className="mt-4 flex flex-col gap-2">
                    {quickLinks.map((q) => (
                      <li key={q.href}>
                        <Button
                          asChild
                          variant="ghost"
                          className="h-auto w-full justify-between py-3"
                        >
                          <Link href={q.href}>
                            <span className="flex items-center gap-2">
                              <q.icon className="size-4 text-primary" aria-hidden />
                              {q.label}
                            </span>
                            <ArrowRight
                              className="size-4 text-muted-foreground"
                              aria-hidden
                            />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {h.rosterEyebrow}
                  </p>
                  <h2 className="font-serif text-xl">{h.rosterTitleDesktop}</h2>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/game/teams">
                    {interpolate(h.viewAll, { n: String(characters.length) })}
                  </Link>
                </Button>
              </div>
              {characters.length === 0 ? (
                <Empty className="border border-dashed border-border bg-card/40">
                  <EmptyHeader>
                    <EmptyTitle>{h.noAdventurers}</EmptyTitle>
                    <EmptyDescription>{h.noAdventurersDesc}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/game/summon">{h.goSummon}</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {characters.slice(0, 6).map((c) => (
                    <CharacterCard key={c.id} character={c} size="sm" />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-serif text-2xl">{value}</div>
      {hint ? (
        <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  )
}
