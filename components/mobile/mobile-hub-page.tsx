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
} from "lucide-react"

import { LocaleSwitcher } from "@/components/locale/locale-switcher"
import { WalletButton } from "@/components/game/wallet-button"
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
import { CharacterCard } from "@/components/game/character-card"
import { MaterialIcon } from "@/components/game/material-icon"
import { GrassrootsTokenIcon } from "@/components/brand/grassroots-token-icon"
import { UsdtIcon } from "@/components/brand/usdt-icon"

import {
  MobileHScroll,
  MobileMain,
  MobileSection,
  MobileTopBar,
} from "@/components/mobile/mobile-shell"

/**
 * 主控台移动端版本 —— 与桌面端 100% 等价的功能：
 *
 *  - 未连接：钱包连接 Empty
 *  - 已连接：新手礼包 / 材料库存 / 全服铸造进度 / 快速通道 / 最近角色
 *
 * 信息密度按移动端节奏重排：垂直堆叠为主，角色用横滑卡片节省空间。
 */
export function MobileHubPage() {
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
      <MobileTopBar
        title={h.topBarTitle}
        description={h.topBarDesc}
        action={
          <div className="flex shrink-0 items-center gap-1">
            <LocaleSwitcher variant="ghost" size="icon" />
            <WalletButton size="sm" />
          </div>
        }
      />
      <MobileMain>
        {!connected ? (
          <Empty className="border border-dashed border-border bg-card/40">
            <EmptyHeader>
              <EmptyMedia>
                <span className="flex size-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary ring-rune">
                  <Sparkles className="size-6" aria-hidden />
                </span>
              </EmptyMedia>
              <EmptyTitle className="font-serif text-xl">{h.connectTitle}</EmptyTitle>
              <EmptyDescription className="text-sm">{h.connectDesc}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={connect} className="w-full gap-2">
                <Sparkles className="size-4" aria-hidden />
                {h.connectCta}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {/* 新手礼包 */}
            {!newPlayerGiftClaimed ? (
              <Card className="overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-card/60 to-card/40">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary ring-rune">
                      <Gift className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-primary">
                        {h.giftEyebrow}
                      </p>
                      <h3 className="mt-0.5 font-serif text-base">{h.giftTitle}</h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {h.giftDescMobile}
                      </p>
                    </div>
                  </div>
                  <Button onClick={claimNewPlayerGift} className="w-full gap-2">
                    <Gift className="size-4" aria-hidden />
                    {h.giftClaim}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {/* 关键数据：2 列紧凑卡片 */}
            <section className="grid grid-cols-2 gap-2.5">
              <MiniStat
                icon={<GrassrootsTokenIcon size={14} title={null} />}
                label="$草根社"
                value={advent.toLocaleString()}
                hint={interpolate(h.statNextPull, {
                  cost: currentSummonCost.toLocaleString(),
                })}
              />
              <MiniStat
                icon={<UsdtIcon size={14} title={null} />}
                label="USDT"
                value={usdt.toFixed(2)}
                hint={h.statUsdtHintShort}
              />
              <MiniStat
                icon={<Sparkles className="size-3.5 text-chart-2" aria-hidden />}
                label={m.common.stamina}
                value={energy.toString()}
                hint={interpolate(h.statEnergyHintShort, {
                  price: String(ENERGY_PRICE_USDT),
                })}
              />
              <MiniStat
                icon={<Users className="size-3.5 text-primary" aria-hidden />}
                label={h.statRoster}
                value={`${characters.length} / ${teams.length}`}
                hint={interpolate(h.statIdleTeams, { n: String(idleTeams) })}
              />
            </section>

            <HubExpeditionDashboard />

            {/* 材料库存 */}
            <MobileSection
              eyebrow={h.materialsEyebrow}
              title={h.materialsTitle}
              action={
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <Link href="/game/market">
                    <Store className="size-3.5" aria-hidden />
                    {h.marketShort}
                  </Link>
                </Button>
              }
            >
              <ul className="grid grid-cols-2 gap-2">
                {MATERIAL_KEYS.map((k) => (
                  <li
                    key={k}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-2.5"
                  >
                    <MaterialIcon material={k} showLabel size="sm" />
                    <span className="font-mono text-base">
                      {inventory[k].toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="mb-1.5 flex flex-col gap-0.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{h.globalMintMobile}</span>
                    <span className="font-mono">
                      {interpolate(h.phaseLineMobile, {
                        phaseDisplay: String(capPhase.phaseDisplay),
                        phaseTotal: String(capPhase.phaseTotal),
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-primary">
                      {capPhase.phaseFilled.toLocaleString()} /{" "}
                      {capPhase.phaseSize.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {interpolate(h.cumulativeShort, {
                        spent: phaseCost.spent.toLocaleString(),
                        total: phaseCost.total.toLocaleString(),
                      })}
                    </span>
                  </div>
                </div>
                <Progress value={capPhase.phasePct} className="h-1.5" />
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {interpolate(h.summonHintMobile, {
                    tier: SUMMON_TIER_SIZE.toLocaleString(),
                  })}
                  <span className="ml-1 font-mono text-primary">
                    {currentSummonCost.toLocaleString()} $草根社
                  </span>
                </p>
              </div>
            </MobileSection>

            {/* 快速通道：横滑卡片 */}
            <MobileSection eyebrow={h.quickEyebrow} title={h.quickTitle}>
              <MobileHScroll>
                {quickLinks.map((q) => (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="group relative flex w-32 shrink-0 snap-start flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 transition active:scale-95"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                      <q.icon className="size-4" aria-hidden />
                    </span>
                    <div className="font-serif text-sm leading-tight">
                      {q.label}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span>{h.goTo}</span>
                      <ArrowRight className="size-3" aria-hidden />
                    </div>
                  </Link>
                ))}
              </MobileHScroll>
            </MobileSection>

            {/* 最近冒险者 */}
            <MobileSection
              eyebrow={h.rosterEyebrow}
              title={h.rosterTitleMobile}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/game/teams">
                    {interpolate(h.viewAllShort, { n: String(characters.length) })}
                  </Link>
                </Button>
              }
            >
              {characters.length === 0 ? (
                <Empty className="border border-dashed border-border bg-card/40">
                  <EmptyHeader>
                    <EmptyTitle className="text-base">{h.noAdventurers}</EmptyTitle>
                    <EmptyDescription className="text-xs">{h.noAdventurersDesc}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild className="w-full">
                      <Link href="/game/summon">{h.goSummon}</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <MobileHScroll>
                  {characters.slice(0, 8).map((c) => (
                    <div
                      key={c.id}
                      className="w-32 shrink-0 snap-start"
                    >
                      <CharacterCard character={c} size="sm" />
                    </div>
                  ))}
                </MobileHScroll>
              )}
            </MobileSection>
          </>
        )}
      </MobileMain>
    </>
  )
}

function MiniStat({
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
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 font-serif text-lg leading-tight">{value}</div>
      {hint ? (
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  )
}
