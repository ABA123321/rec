"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BookOpen,
  Coins,
  Download,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Wallet,
} from "lucide-react"

import { RuneAbyssLogo } from "@/components/brand/rune-abyss-logo"
import { LocaleSwitcher } from "@/components/locale/locale-switcher"
import { useLocale } from "@/components/providers/locale-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ENERGY_PRICE_USDT,
  MARKET_FEE,
  REFERRAL_DIRECT,
  REFERRAL_INDIRECT,
  SUMMON_BASE_COST,
  TOTAL_CHAR_CAP,
} from "@/lib/game-data"
import type { AppLocale } from "@/lib/i18n/config"
import { interpolate } from "@/lib/i18n/interpolate"
import { CHAIN_ID, CONTRACTS, explorer } from "@/lib/web3/contracts"

/** 与 `npm run pdf:whitepaper:public` + `npm run pdf:marketing:public` 输出到 `public/downloads/` 一致 */
const PDF_HREFS_ZH = [
  "/downloads/Rune-Abyss-白皮书.pdf",
  "/downloads/Rune-Abyss-品牌叙事.pdf",
  "/downloads/Rune-Abyss-一页纸-投资生态.pdf",
] as const

/** 与 `npm run pdf:whitepaper:public:en` + `npm run pdf:marketing:public:en` 输出一致（见 `scripts/build-*-pdf.mjs`） */
const PDF_HREFS_EN = [
  "/downloads/Rune-Abyss-White-Paper-Public-EN.pdf",
  "/downloads/Rune-Abyss-Brand-Narrative-Public-EN.pdf",
  "/downloads/Rune-Abyss-One-Pager-Invest-Ecosystem-Public-EN.pdf",
] as const

function pdfHrefsForLocale(locale: AppLocale) {
  return locale === "zh" ? PDF_HREFS_ZH : PDF_HREFS_EN
}

const CONTRACT_ADDRESS_ROWS: {
  key: keyof typeof CONTRACTS
  label: string
}[] = [
  { key: "Game", label: "Game" },
  { key: "CharacterNFT", label: "Character NFT" },
  { key: "Materials", label: "Materials" },
  { key: "Marketplace", label: "Marketplace" },
  { key: "AdventToken", label: "AdventToken ($REBC)" },
  { key: "USDT", label: "USDT" },
  { key: "Stamina", label: "Stamina" },
  { key: "ReferralRegistry", label: "ReferralRegistry" },
]

function SectionTitle({
  eyebrow,
  title,
  id,
}: {
  eyebrow: string
  title: string
  id?: string
}) {
  return (
    <div {...(id ? { id } : {})} className={id ? "scroll-mt-28" : undefined}>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl text-balance sm:text-3xl">{title}</h2>
    </div>
  )
}

export function UserGuideView() {
  const { messages: m, locale } = useLocale()
  const d = m.docs
  const pdfHrefs = pdfHrefsForLocale(locale)
  const feePct = (MARKET_FEE * 100).toFixed(0)
  const directPct = (REFERRAL_DIRECT * 100).toFixed(0)
  const indirectPct = (REFERRAL_INDIRECT * 100).toFixed(0)

  const tocItems = [
    { href: "#intro", label: d.toc.intro },
    { href: "#downloads", label: d.toc.downloads },
    { href: "#highlights", label: d.toc.highlights },
    { href: "#tokens", label: d.toc.tokens },
    { href: "#prepare", label: d.toc.prepare },
    { href: "#guide", label: d.toc.guide },
    { href: "#ai", label: d.toc.ai },
    { href: "#faq", label: d.toc.faq },
    { href: "#contracts", label: d.toc.contracts },
    { href: "#help", label: d.toc.help },
  ]

  const highlights = d.highlights.items.map((item, i) => {
    if (i === 4) {
      return {
        title: item.title,
        desc: interpolate(item.desc, { feePct }),
      }
    }
    if (i === 5) {
      return {
        title: item.title,
        desc: interpolate(item.desc, { directPct, indirectPct }),
      }
    }
    return { title: item.title, desc: item.desc }
  })

  const guideSteps = d.guide.steps.map((step, i) => ({
    title: step.title,
    body:
      i === 1
        ? interpolate(step.body, { energyPrice: String(ENERGY_PRICE_USDT) })
        : step.body,
  }))

  return (
    <main className="relative min-h-screen overflow-hidden pb-16">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <RuneAbyssLogo size={22} title={null} />
              <span className="font-serif tracking-wide text-foreground">{m.common.brandSubtitle}</span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <LocaleSwitcher />
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <a href="https://flap.sh/" target="_blank" rel="noopener noreferrer">
                  Flap
                  <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                </a>
              </Button>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/game">
                  {m.common.enterGame}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
          <nav
            aria-label={d.navAria}
            className="-mx-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible"
          >
            {tocItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full border border-border/80 bg-card/50 px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-primary sm:text-xs"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section className="relative border-b border-border">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero-rune-abyss.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/85 to-background" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Badge
            variant="outline"
            className="gap-2 border-primary/40 bg-primary/10 px-3 py-1 font-mono text-primary"
          >
            <BookOpen className="size-3.5" aria-hidden />
            {d.hero.badge}
          </Badge>
          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            <span className="text-glow-gold">{d.hero.line1}</span>
            <span className="block text-foreground/90">{d.hero.line2}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {d.hero.lead}
            <span className="text-foreground/80"> {d.hero.leadEm}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/game">
                <Sparkles className="size-4" aria-hidden />
                {m.common.startPlaying}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <a href="https://flap.sh/" target="_blank" rel="noopener noreferrer">
                {d.flapFairLaunch}
                <ExternalLink className="size-4 opacity-70" aria-hidden />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6 sm:py-16">
        <section id="intro" className="scroll-mt-28 space-y-4">
          <SectionTitle eyebrow={d.intro.eyebrow} title={d.intro.title} />
          <Card className="border-border bg-card/50">
            <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">{d.intro.p1a}</strong> {d.intro.p1b}
              </p>
              <p className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 font-medium text-foreground">
                {d.intro.loop}
              </p>
              <p>
                {d.intro.p2a} <strong className="text-foreground">{d.intro.zeroMint}</strong>
                {d.intro.p2b}
                <strong className="text-foreground">{d.intro.p2c}</strong>
                {d.intro.p2d}
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="downloads" className="scroll-mt-28 space-y-6">
          <SectionTitle eyebrow={d.downloads.eyebrow} title={d.downloads.title} />
          <p className="text-sm leading-relaxed text-muted-foreground">{d.downloads.lead}</p>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
            {d.downloads.pdfs.map((item, idx) => (
              <Card
                key={pdfHrefs[idx]}
                className="flex flex-col border-border bg-card/45 transition hover:border-primary/35"
              >
                <CardContent className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <h3 className="font-serif text-lg text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                  <Button asChild className="mt-auto w-full gap-2 sm:w-auto">
                    <a href={pdfHrefs[idx]} download>
                      <Download className="size-4" aria-hidden />
                      {m.common.downloadPdf}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <SectionTitle eyebrow={d.highlights.eyebrow} title={d.highlights.title} id="highlights" />
          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((h) => (
              <Card
                key={h.title}
                className="border-border bg-card/40 transition hover:border-primary/35 hover:bg-card/60"
              >
                <CardContent className="space-y-2 p-5">
                  <h3 className="font-serif text-lg text-foreground">{h.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{h.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {d.highlights.flapLine}{" "}
            <a
              href="https://flap.sh/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              https://flap.sh/
            </a>
          </p>
        </section>

        <section className="space-y-6">
          <SectionTitle eyebrow={d.tokens.eyebrow} title={d.tokens.title} id="tokens" />
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border bg-card/40">
              <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-serif text-lg text-foreground">
                  <Coins className="size-5 text-primary" aria-hidden />
                  {d.tokens.adventTitle}
                </div>
                <ul className="list-inside list-disc space-y-2 leading-relaxed">
                  <li>{d.tokens.advent1}</li>
                  <li>{d.tokens.advent2}</li>
                  <li>
                    {d.tokens.advent3a}
                    <a
                      href="https://flap.sh/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {d.tokens.advent3b}
                    </a>
                    {d.tokens.advent3c}
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/40">
              <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-serif text-lg text-foreground">
                  <Wallet className="size-5 text-chart-2" aria-hidden />
                  {d.tokens.walletTitle}
                </div>
                <ul className="list-inside list-disc space-y-2 leading-relaxed">
                  <li>{d.tokens.wallet1}</li>
                  <li>{d.tokens.wallet2}</li>
                  <li>
                    {interpolate(d.tokens.wallet3a, {
                      summonBase: SUMMON_BASE_COST.toLocaleString(),
                      cap: TOTAL_CHAR_CAP.toLocaleString(),
                    })}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle eyebrow={d.prepare.eyebrow} title={d.prepare.title} id="prepare" />
          <ol className="list-inside list-decimal space-y-2 text-sm leading-relaxed text-muted-foreground">
            {d.prepare.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        <section className="space-y-8">
          <SectionTitle eyebrow={d.guide.eyebrow} title={d.guide.title} id="guide" />
          <div className="space-y-6">
            {guideSteps.map((step, i) => (
              <Card key={step.title} className="border-border bg-card/35">
                <CardContent className="flex gap-4 p-5 sm:gap-6">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-sm text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-serif text-lg text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/game/summon">{d.guide.linkSummon}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/game/teams">{d.guide.linkTeams}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/game/dungeons">{d.guide.linkDungeons}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/game/market">{d.guide.linkMarket}</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle eyebrow={d.ai.eyebrow} title={d.ai.title} id="ai" />
          <Card className="border-chart-1/30 bg-gradient-to-br from-chart-1/10 via-card/40 to-transparent">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 font-serif text-xl text-foreground">
                <Bot className="size-6 text-chart-1" aria-hidden />
                {d.ai.whatTitle}
              </div>
              <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">
                {d.ai.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="rounded-md border border-chart-5/25 bg-chart-5/10 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-chart-5">{d.ai.warnTitle}</strong>
                {d.ai.warnBody}
                <span className="text-foreground/90">{d.ai.warnTail}</span>
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionTitle eyebrow={d.faq.eyebrow} title={d.faq.title} id="faq" />
          <div className="space-y-3">
            {d.faq.items.map((item) => (
              <Card key={item.q} className="border-border bg-card/35">
                <CardContent className="space-y-2 p-5">
                  <div className="flex gap-2 text-sm font-medium text-foreground">
                    <HelpCircle className="size-4 shrink-0 text-primary" aria-hidden />
                    {item.q}
                  </div>
                  <p className="pl-6 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle eyebrow={d.contracts.eyebrow} title={d.contracts.title} id="contracts" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {d.contracts.chainId} {CHAIN_ID}
            </Badge>
          </div>
          <Card className="border-border bg-card/35">
            <CardContent className="space-y-0 divide-y divide-border p-0">
              {CONTRACT_ADDRESS_ROWS.map((row) => {
                const addr = CONTRACTS[row.key]
                return (
                  <div
                    key={row.key}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium text-foreground">{row.label}</div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {d.contracts.rows[row.key]}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <code className="break-all rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-[11px] text-foreground sm:text-right sm:max-w-[min(100%,22rem)]">
                        {addr}
                      </code>
                      <a
                        href={explorer.address(addr)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {CHAIN_ID === 97 ? m.common.bscScanTestnet : m.common.bscScan}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionTitle eyebrow={d.help.eyebrow} title={d.help.title} id="help" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {d.help.body}
            <strong className="text-foreground">{d.help.bodyEm}</strong>
            {d.help.bodyEnd}
          </p>
          <div className="flex flex-wrap gap-2 border-t border-border pt-8">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="size-4" aria-hidden />
                {m.common.backHome}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/game">{m.common.enterGameConsole}</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
