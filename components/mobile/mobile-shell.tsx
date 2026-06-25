"use client"

import * as React from "react"
import { Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { GrassrootsTokenIcon } from "@/components/brand/grassroots-token-icon"
import { UsdtIcon } from "@/components/brand/usdt-icon"
import { WalletButton } from "@/components/game/wallet-button"

/**
 * 移动端通用页头：紧凑标题 + 钱包按钮（或自定义 action） + 余额条
 *
 * - 高度比桌面 TopBar 更紧凑（避免占用宝贵纵向空间）
 * - 标题 / 描述行 + 钱包按钮（或 action）放第一行
 * - 余额药丸条独立第二行，只有连接后才显示，所有内页都能看到余额
 * - 整体 sticky 在 GameMobileBrandBar 之下（top-11 = 44px）
 *
 * 当业务页面需要把"钱包按钮"换成自定义按钮（例如"新建队伍"）时，
 * 通过 `action` prop 传入；不传时默认渲染 WalletButton。
 */
export function MobilePageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  const { connected, advent, usdt, energy } = useGame()
  const { messages: m } = useLocale()

  return (
    <header className="sticky top-11 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-base leading-tight tracking-wide text-glow-gold">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">{action ?? <WalletButton size="sm" />}</div>
      </div>

      {connected ? (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/50 px-4 py-1.5 scrollbar-none">
          <BalancePill
            icon={<GrassrootsTokenIcon size={11} title={null} />}
            label="草根社"
            value={advent.toLocaleString()}
          />
          <BalancePill
            icon={<UsdtIcon size={11} title={null} />}
            label="USDT"
            value={usdt.toFixed(2)}
          />
          <BalancePill
            icon={<Zap className="size-3 text-chart-2" aria-hidden />}
            label={m.common.stamina}
            value={energy.toString()}
          />
        </div>
      ) : null}
    </header>
  )
}

/**
 * 向后兼容别名 — 早期 mobile-hub-page 使用 `MobileTopBar` 这个名字。
 * 新页面应统一使用 `MobilePageHeader`。
 */
export const MobileTopBar = MobilePageHeader

function BalancePill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2.5 py-0.5">
      {icon}
      <span className="font-mono text-[11px] leading-none">{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

/**
 * 移动端内容容器：处理水平内边距 + 顶部/底部安全间距（避开 bottom nav）。
 */
export function MobileMain({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main className={cn("flex-1 px-4 py-4", className)}>
      <div className="flex flex-col gap-4">{children}</div>
    </main>
  )
}

/**
 * 移动端区块：标题 + 操作 + 内容。所有 game 页面都用同一个布局原语保持一致性。
 */
export function MobileSection({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="truncate font-serif text-lg tracking-wide">{title}</h2>
          {description ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

/**
 * 移动端横向滑动容器：用于角色卡 / 快速通道这类需要更多元素的场景。
 */
export function MobileHScroll({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1",
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * 移动端 sticky 底部操作栏（在 bottom-nav 之上）。
 * 用于挑战 / 召唤 / 合成等需要"主操作"明确呈现的页面。
 */
export function MobileStickyAction({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="sticky bottom-[calc(60px+env(safe-area-inset-bottom))] z-10 -mx-4 mt-2 border-t border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {children}
    </div>
  )
}
