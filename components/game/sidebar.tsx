"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  FlaskConical,
  Home,
  Map,
  ScrollText,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useGame } from "@/components/providers/game-provider"
import { GrassrootsTokenIcon } from "@/components/brand/grassroots-token-icon"
import { RuneAbyssLogo } from "@/components/brand/rune-abyss-logo"
import { UsdtIcon } from "@/components/brand/usdt-icon"
import { LocaleSwitcher } from "@/components/locale/locale-switcher"
import { useLocale } from "@/components/providers/locale-provider"

const NAV = [
  { href: "/game", key: "hub" as const, short: "Hub", icon: Home },
  { href: "/game/summon", key: "summon" as const, short: "Summon", icon: Sparkles },
  { href: "/game/teams", key: "teams" as const, short: "Teams", icon: Users },
  { href: "/game/dungeons", key: "dungeons" as const, short: "Abyss", icon: Map },
  { href: "/game/synthesis", key: "synthesis" as const, short: "Forge", icon: FlaskConical },
  { href: "/game/market", key: "market" as const, short: "Market", icon: Store },
  { href: "/game/referral", key: "referral" as const, short: "Refer", icon: ScrollText },
] as const

export function GameSidebar() {
  const pathname = usePathname()
  const { advent, usdt, energy } = useGame()
  const { messages: m } = useLocale()

  return (
    <aside
      className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl"
      aria-label={m.common.mainNav}
    >
      <Link
        href="/"
        className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5"
        aria-label={m.common.homeLinkAria}
      >
        <RuneAbyssLogo size={36} glow title={null} />
        <div className="flex flex-col leading-tight">
          <span className="font-serif text-lg tracking-wide text-glow-gold">Rune Abyss</span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {m.common.brandSubtitle}
          </span>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-primary/30"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon
                    className={cn("size-4", active ? "text-primary" : "text-muted-foreground")}
                    aria-hidden
                  />
                  <span className="flex-1">{m.common.gameNav[item.key]}</span>
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-widest",
                      active ? "text-primary" : "text-muted-foreground/60",
                    )}
                    aria-hidden
                  >
                    {item.short}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 border-t border-sidebar-border pt-3">
          <Link
            href="/docs"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition",
              "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              pathname === "/docs" && "bg-sidebar-accent/40 text-sidebar-accent-foreground",
            )}
          >
            <BookOpen className="size-4 text-primary" aria-hidden />
            <span className="flex-1">{m.common.officialDocs}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Docs
            </span>
          </Link>
        </div>
      </nav>

      <div className="px-3 pb-2">
        <LocaleSwitcher className="w-full justify-center" size="sm" />
      </div>

      <div className="m-3 rounded-xl border border-sidebar-border bg-card/60 p-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {m.common.balanceOverview}
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <GrassrootsTokenIcon size={14} title={null} />
              $草根社
            </span>
            <span className="font-mono">{advent.toLocaleString()}</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <UsdtIcon size={14} title={null} className="ring-2 ring-[#26A17B]/25" />
              USDT
            </span>
            <span className="font-mono">{usdt.toFixed(2)}</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Zap className="size-3.5 text-chart-2" aria-hidden />
              {m.common.stamina}
            </span>
            <span className="font-mono">{energy}</span>
          </li>
        </ul>
      </div>
    </aside>
  )
}

/** 移动端顶部品牌条 — 仅显示 logo + 名称，导航全部下沉到底部 Tab Bar。 */
export function GameMobileBrandBar() {
  const { messages: m } = useLocale()
  return (
    <div
      className="md:hidden sticky top-0 z-30 flex h-11 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl"
      aria-label={m.common.brandBarAria}
    >
      <Link
        href="/"
        className="flex items-center gap-2"
        aria-label={m.common.homeLinkAria}
      >
        <RuneAbyssLogo size={26} glow title={null} />
        <span className="font-serif text-sm tracking-wide text-glow-gold">Rune Abyss</span>
      </Link>
      <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.25em] text-primary">
        BSC · 56
      </span>
    </div>
  )
}

/** 移动端底部导航 — 7 项均分，icon + 短中文标签，固定在视口底部。 */
export function GameMobileBottomNav() {
  const pathname = usePathname()
  const { messages: m } = useLocale()
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={m.common.mainNav}
    >
      <ul className="grid grid-cols-7 gap-px">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[44px] touch-manipulation flex-col items-center justify-center gap-1 px-0.5 py-2 text-[11px] leading-tight transition active:opacity-90",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {/* 顶部高亮指示条 */}
                <span
                  className={cn(
                    "absolute inset-x-2 top-0 h-0.5 rounded-b-full transition",
                    active ? "bg-primary shadow-[0_0_8px_currentColor]" : "bg-transparent",
                  )}
                  aria-hidden
                />
                <item.icon className={cn("size-5 shrink-0", active && "drop-shadow-[0_0_4px_currentColor]")} aria-hidden />
                <span className="max-w-full truncate text-center font-mono tracking-wide">
                  {m.common.gameNav[item.key]}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
