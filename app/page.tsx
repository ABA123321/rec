"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FlaskConical,
  Map,
  ScrollText,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react"

import { RuneAbyssLogo } from "@/components/brand/rune-abyss-logo"
import { RuneSigil } from "@/components/brand/rune-sigil"
import { LandingEcosystemStrip } from "@/components/landing/ecosystem-strip"
import { LocaleSwitcher } from "@/components/locale/locale-switcher"
import { useLocale } from "@/components/providers/locale-provider"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DUNGEONS,
  RARITIES,
  SUMMON_BASE_COST,
  TOTAL_CHAR_CAP,
  ENERGY_PRICE_USDT,
  REFERRAL_DIRECT,
  REFERRAL_INDIRECT,
  MARKET_FEE,
} from "@/lib/game-data"
import { interpolate } from "@/lib/i18n/interpolate"

const FEATURE_BLOCKS = [
  { icon: Sparkles, href: "/game/summon", featureIndex: 0 },
  { icon: Users, href: "/game/teams", featureIndex: 1 },
  { icon: Map, href: "/game/dungeons", featureIndex: 2 },
  { icon: FlaskConical, href: "/game/synthesis", featureIndex: 3 },
  { icon: Store, href: "/game/market", featureIndex: 4 },
  { icon: ScrollText, href: "/game/referral", featureIndex: 5 },
] as const

export default function LandingPage() {
  const { messages: m } = useLocale()
  const L = m.landing
  const feePct = (MARKET_FEE * 100).toFixed(0)
  const directPct = (REFERRAL_DIRECT * 100).toFixed(0)
  const indirectPct = (REFERRAL_INDIRECT * 100).toFixed(0)

  const heroStats = [
    {
      k: L.stats.supply.k,
      v: L.stats.supply.v,
      sub: L.stats.supply.sub,
    },
    {
      k: L.stats.cap.k,
      v: interpolate(L.stats.cap.v, { cap: TOTAL_CHAR_CAP.toLocaleString() }),
      sub: L.stats.cap.sub,
    },
    {
      k: L.stats.energy.k,
      v: interpolate(L.stats.energy.v, { price: String(ENERGY_PRICE_USDT) }),
      sub: L.stats.energy.sub,
    },
    {
      k: L.stats.dungeons.k,
      v: interpolate(L.stats.dungeons.v, { n: String(DUNGEONS.length) }),
      sub: L.stats.dungeons.sub,
    },
  ]

  const economyStats = L.economyStats.map((row, i) =>
    i === 2
      ? {
          k: row.k,
          v: interpolate(row.v, { feePct }),
          sub: row.sub,
        }
      : row,
  )

  return (
    <main className="relative overflow-hidden">
      <section className="relative">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero-rune-abyss.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>

        <div className="mx-auto flex min-h-[80vh] max-w-6xl flex-col items-start justify-center gap-6 px-5 py-16 sm:gap-8 sm:px-6 sm:py-24 lg:min-h-[88vh]">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <Badge
              variant="outline"
              className="gap-2 border-primary/40 bg-primary/10 px-3 py-1 font-mono text-primary"
            >
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              {L.heroBadge}
            </Badge>
            <LocaleSwitcher />
          </div>

          <div className="max-w-3xl space-y-4 sm:space-y-5">
            <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="text-glow-gold">Rune Abyss</span>
              <span className="block text-foreground/90">{L.heroSubtitle}</span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              {L.heroLead}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2 font-medium">
              <Link href="/game">
                {m.common.enterAbyss}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/game/summon">
                <Sparkles className="size-4" aria-hidden />
                {m.common.summonNow}
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="gap-2 border border-border bg-card/80">
              <Link href="/docs">
                <BookOpen className="size-4" aria-hidden />
                {m.common.officialDocs}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 border-primary/30 bg-primary/5">
              <a
                href="https://www.rebc.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${L.rebcMintCta} ${L.openInNewTab}`}
              >
                {L.rebcMintCta}
                <ExternalLink className="size-4 shrink-0 opacity-80" aria-hidden />
              </a>
            </Button>
          </div>

          <dl className="mt-6 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {heroStats.map((s) => (
              <div
                key={s.k}
                className="rounded-lg border border-border bg-card/60 p-4 backdrop-blur"
              >
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">{s.k}</dt>
                <dd className="mt-1 font-serif text-2xl text-foreground">{s.v}</dd>
                <dd className="text-[11px] text-muted-foreground">{s.sub}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {L.rarityEyebrow}
              </p>
              <h2 className="font-serif text-2xl">{L.rarityTitle}</h2>
            </div>
            <Link
              href="/game/summon"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {L.rarityGoSummon}
            </Link>
          </div>

          <div className="-mx-5 md:mx-0">
            <ul
              className="flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:snap-none md:grid-cols-5 md:touch-auto md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {RARITIES.map((r) => {
                const wrap: Record<1 | 2 | 3 | 4 | 5, string> = {
                  1: "border-chart-1/40 from-chart-1/15",
                  2: "border-chart-2/40 from-chart-2/15",
                  3: "border-chart-3/40 from-chart-3/15",
                  4: "border-chart-4/50 from-chart-4/20",
                  5: "border-chart-5/50 from-chart-5/20",
                }
                const text: Record<1 | 2 | 3 | 4 | 5, string> = {
                  1: "text-chart-1",
                  2: "text-chart-2",
                  3: "text-chart-3",
                  4: "text-chart-4",
                  5: "text-chart-5",
                }
                return (
                  <li
                    key={r.level}
                    className={`group w-[min(82vw,272px)] shrink-0 snap-start overflow-hidden rounded-xl border bg-gradient-to-br to-transparent md:w-auto md:shrink ${wrap[r.tone]}`}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden">
                      <Image
                        src={r.image || "/placeholder.svg"}
                        alt={interpolate(L.portraitAlt, { name: r.name })}
                        fill
                        sizes="(max-width: 768px) 82vw, 220px"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent" />
                      <div
                        className={`absolute left-3 top-3 rounded-md border bg-background/70 px-2 py-0.5 font-mono text-[10px] backdrop-blur ${text[r.tone]} border-current/40`}
                      >
                        Lv.{r.level} · {(r.prob * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="font-serif text-base leading-tight">{r.name}</div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {L.powerLabel}
                        </span>
                        <span className={`font-mono text-lg ${text[r.tone]}`}>
                          {r.powerMin} – {r.powerMax}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 flex flex-col items-start gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {L.featuresEyebrow}
          </p>
          <h2 className="font-serif text-3xl text-balance">{L.featuresTitle}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURE_BLOCKS.map(({ icon: Icon, href, featureIndex }) => {
            const f = L.features[featureIndex]
            const desc = interpolate(f.desc, {
              summonCost: SUMMON_BASE_COST.toLocaleString(),
              cap: TOTAL_CHAR_CAP.toLocaleString(),
              dungeonCount: String(DUNGEONS.length),
              feePct,
              directPct,
              indirectPct,
            })
            return (
              <Link key={href} href={href} className="group">
                <Card className="h-full border-border bg-card/60 transition group-hover:border-primary/40 group-hover:bg-card">
                  <CardContent className="flex h-full flex-col gap-3 p-6">
                    <span className="flex size-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="font-serif text-xl">{f.title}</h3>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                    <span className="mt-2 flex items-center gap-1 text-xs text-primary">
                      {m.common.learnMore}
                      <ArrowRight
                        className="size-3 transition group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {L.economyEyebrow}
            </p>
            <h2 className="mt-2 font-serif text-3xl">{L.economyTitle}</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{L.economyLead}</p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {economyStats.map((s) => (
                <div key={s.k} className="rounded-lg border border-border bg-background/60 p-4">
                  <dt className="text-xs text-muted-foreground">{s.k}</dt>
                  <dd className="font-serif text-2xl text-primary">{s.v}</dd>
                  <dd className="text-[11px] text-muted-foreground">{s.sub}</dd>
                </div>
              ))}
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/40 via-background/20 to-card/40">
            <RuneSigil className="absolute inset-0 h-full w-full" spin opacity={0.9} />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
              <div>
                <div className="font-serif text-2xl text-glow-gold">$REBC</div>
                <div className="text-xs text-muted-foreground">{L.adventTagline}</div>
              </div>
              <Button asChild size="sm" variant="outline" className="gap-2">
                <Link href="/game">
                  <RuneAbyssLogo size={16} title={null} />
                  {m.common.console}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <LandingEcosystemStrip />

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-center text-xs text-muted-foreground sm:px-6 sm:text-left sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
            <div className="flex items-center gap-2">
              <Zap className="size-3.5 text-primary" aria-hidden />
              <span className="font-mono">{L.footerMvp}</span>
            </div>
            <Link
              href="/docs"
              className="flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              <BookOpen className="size-3.5" aria-hidden />
              {m.common.officialDocs}
            </Link>
          </div>
          <span>© 2026 · BSC</span>
        </div>
      </footer>
    </main>
  )
}
