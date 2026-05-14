"use client"

import * as React from "react"
import { Loader2, Plus, ShoppingCart, X } from "lucide-react"

import { MaterialIcon } from "@/components/game/material-icon"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useGame, type MarketListing } from "@/components/providers/game-provider"
import { MARKET_FEE, MATERIAL_KEYS, type MaterialKey } from "@/lib/game-data"
import { MobilePageHeader, MobileSection } from "./mobile-shell"
// 复用桌面端实现好的两个 Dialog — 它们与 viewport 无关，纯逻辑，
// 唯一例外是 max-w-md 在手机上会自动 fallback 为 calc(100% - 2rem)（shadcn dialog 默认行为）
import {
  ListDialog,
  BuyDialog,
} from "@/components/desktop/desktop-market-page"

const PAGE_SIZE_MOBILE = 10

export function MobileMarketPage() {
  const {
    connected,
    connect,
    listings,
    inventory,
    listMaterial,
    cancelListing,
    buyListing,
    isMaterialsApprovedForMarketplace,
    approveMaterialsForMarketplace,
    usdtAllowanceForMarketplace,
    approveUsdtForMarketplace,
    isTxPending,
    setMarketMaterialFilter,
    marketHasMore,
    ensureMarketWindow,
  } = useGame()

  const { messages: m } = useLocale()
  const mk = m.game.market
  const s = m.game.shared

  const [filter, setFilter] = React.useState<MaterialKey | "ALL">("ALL")

  React.useEffect(() => {
    setMarketMaterialFilter(filter)
  }, [filter, setMarketMaterialFilter])
  const [listOpen, setListOpen] = React.useState(false)
  const [buyTarget, setBuyTarget] = React.useState<MarketListing | null>(null)
  const [page, setPage] = React.useState(0)

  const filtered = React.useMemo(() => {
    if (filter === "ALL") return listings
    return listings.filter((l) => l.material === filter)
  }, [listings, filter])

  React.useEffect(() => {
    setPage(0)
  }, [filter])

  React.useEffect(() => {
    void ensureMarketWindow((page + 1) * PAGE_SIZE_MOBILE)
  }, [ensureMarketWindow, filter, page])

  const loadedPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_MOBILE) || 1)
  const totalPages = marketHasMore ? loadedPages + 1 : loadedPages
  const paged = React.useMemo(
    () =>
      filtered.slice(page * PAGE_SIZE_MOBILE, (page + 1) * PAGE_SIZE_MOBILE),
    [filtered, page],
  )

  React.useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  return (
    <>
      <MobilePageHeader
        title={mk.title}
        description={interpolate(mk.desc, { fee: String(MARKET_FEE * 100) })}
      />

      <main className="flex-1 px-4 py-4 pb-28">
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
            {/* 横滑材料筛选条 — 用 scroll-snap 提升触摸滑动手感 */}
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] snap-x snap-mandatory">
              <FilterChip
                active={filter === "ALL"}
                onClick={() => setFilter("ALL")}
                label={mk.filterAll}
              />
              {MATERIAL_KEYS.map((k) => (
                <FilterChip
                  key={k}
                  active={filter === k}
                  onClick={() => setFilter(k)}
                  label={k}
                />
              ))}
            </div>

            {/* 挂单列表 */}
            {filtered.length === 0 ? (
              <Empty className="border border-dashed border-border bg-card/40">
                <EmptyHeader>
                  <EmptyTitle>{mk.emptyList}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <ul className="flex flex-col gap-2.5">
                  {paged.map((l) => (
                    <li key={l.id}>
                      <MobileListingCard
                        listing={l}
                        onBuy={() => setBuyTarget(l)}
                        onCancel={() => cancelListing(l.id)}
                      />
                    </li>
                  ))}
                </ul>

                {totalPages > 1 ? (
                  <div className="flex items-center justify-between gap-2 px-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex-1"
                    >
                      {s.prevPageAria}
                    </Button>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page === totalPages - 1}
                      className="flex-1"
                    >
                      {s.nextPageAria}
                    </Button>
                  </div>
                ) : null}
              </>
            )}

            <MobileSection title={mk.footnoteTitle}>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{mk.footnote}</p>
            </MobileSection>
          </div>
        )}
      </main>

      {/* sticky 底部"挂单出售"按钮 — 移动端最重要的主行为 */}
      {connected ? (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
          <div className="rounded-xl border border-primary/40 bg-background/95 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <Button
              size="lg"
              className="w-full gap-2 font-serif"
              onClick={() => setListOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              {mk.listSell}
            </Button>
          </div>
        </div>
      ) : null}

      {/* 复用桌面 dialog — viewport 自适应 */}
      <ListDialog
        open={listOpen}
        onOpenChange={setListOpen}
        inventory={inventory}
        isApproved={isMaterialsApprovedForMarketplace}
        isTxPending={isTxPending}
        onApprove={approveMaterialsForMarketplace}
        onSubmit={async (material, amount, price) => {
          const ok = await listMaterial(material, amount, price)
          if (ok) setListOpen(false)
        }}
      />

      <BuyDialog
        listing={buyTarget}
        usdtAllowance={usdtAllowanceForMarketplace}
        isTxPending={isTxPending}
        onApprove={approveUsdtForMarketplace}
        onClose={() => setBuyTarget(null)}
        onSubmit={async (amount) => {
          if (!buyTarget) return
          const ok = await buyListing(buyTarget.id, amount)
          if (ok) setBuyTarget(null)
        }}
      />
    </>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 snap-start rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

function MobileListingCard({
  listing,
  onBuy,
  onCancel,
}: {
  listing: MarketListing
  onBuy: () => void
  onCancel: () => void
}) {
  const { messages: m } = useLocale()
  const mk = m.game.market
  const s = m.game.shared
  const mat = m.game.materials
  const total = listing.pricePerUnit * listing.amount

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="flex flex-col gap-2.5 p-3">
        {/* 第一行：材料图标 + 名称 + Mine 标签 */}
        <div className="flex items-center gap-2.5">
          <MaterialIcon material={listing.material} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-serif text-sm">{mat[listing.material]}</span>
              <Badge
                variant="outline"
                className="shrink-0 font-mono text-[9px]"
              >
                {listing.material}
              </Badge>
              {listing.isMine ? (
                <Badge className="shrink-0 border-primary/40 bg-primary/20 text-[9px] text-primary">
                  {mk.myListingBadge}
                </Badge>
              ) : null}
            </div>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {listing.id} · {listing.seller}
            </p>
          </div>
        </div>

        {/* 第二行：数量 / 单价 / 总价 - 三栏紧凑布局 */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-background/40 p-2">
          <MiniStat label={mk.statQty} value={listing.amount.toLocaleString()} />
          <MiniStat
            label={mk.rowUnit}
            value={listing.pricePerUnit.toFixed(4)}
            highlight
          />
          <MiniStat label={s.total} value={total.toFixed(2)} />
        </div>

        {/* 第三行：购买 / 撤单 全宽按钮 */}
        {listing.isMine ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="w-full gap-1.5 text-destructive hover:text-destructive"
          >
            <X className="size-3.5" aria-hidden />
            {mk.cancelOrder}
          </Button>
        ) : (
          <Button size="sm" onClick={onBuy} className="w-full gap-1.5">
            <ShoppingCart className="size-3.5" aria-hidden />
            {mk.buy}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span
        className={`truncate font-mono text-xs ${
          highlight ? "font-semibold text-primary" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
