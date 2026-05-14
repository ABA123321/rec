"use client"

import * as React from "react"
import {
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Tag,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { TopBar } from "@/components/game/top-bar"
import { MaterialIcon } from "@/components/game/material-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGame, type MarketListing } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { MARKET_FEE, MATERIAL_KEYS, type MaterialKey } from "@/lib/game-data"

export function DesktopMarketPage() {
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
  const mat = m.game.materials

  const [filter, setFilter] = React.useState<MaterialKey | "ALL">("ALL")

  React.useEffect(() => {
    setMarketMaterialFilter(filter)
  }, [filter, setMarketMaterialFilter])
  const [listOpen, setListOpen] = React.useState(false)
  const [buyTarget, setBuyTarget] = React.useState<MarketListing | null>(null)
  const [page, setPage] = React.useState(0)

  const ITEMS_PER_PAGE = 10

  const filtered = React.useMemo(() => {
    if (filter === "ALL") return listings
    return listings.filter((l) => l.material === filter)
  }, [listings, filter])

  // 重新过滤时重置页码
  React.useEffect(() => {
    setPage(0)
  }, [filter])

  // 分页计算
  React.useEffect(() => {
    void ensureMarketWindow((page + 1) * ITEMS_PER_PAGE)
  }, [ensureMarketWindow, filter, page])

  const loadedPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1)
  const totalPages = marketHasMore ? loadedPages + 1 : loadedPages
  const paged = React.useMemo(
    () => filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [filtered, page],
  )

  // 当总数变化时把页码 clamp 回有效范围
  React.useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  return (
    <>
      <TopBar
        title={mk.title}
        description={interpolate(mk.desc, { fee: String(MARKET_FEE * 100) })}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
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
          <div className="flex flex-col gap-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="-mx-1 flex w-full overflow-x-auto px-1 sm:w-auto">
                <ButtonGroup className="shrink-0">
                  <Button
                    variant={filter === "ALL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("ALL")}
                  >
                    {mk.filterAll}
                  </Button>
                  {MATERIAL_KEYS.map((k) => (
                    <Button
                      key={k}
                      variant={filter === k ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter(k)}
                    >
                      {k}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>

              <Button
                onClick={() => setListOpen(true)}
                className="ml-auto gap-2 sm:ml-0"
                size="sm"
              >
                <Plus className="size-4" aria-hidden />
                {mk.listSell}
              </Button>
            </div>

            {/* Listings */}
            {filtered.length === 0 ? (
              <Empty className="border border-dashed border-border bg-card/40">
                <EmptyHeader>
                  <EmptyTitle>{mk.emptyList}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <Card className="border-border bg-card/60">
                  <CardContent className="p-0">
                    <ul className="divide-y divide-border">
                      {paged.map((l) => (
                        <li
                          key={l.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6"
                        >
                          <div className="flex flex-1 items-center gap-3">
                            <MaterialIcon material={l.material} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-serif text-base">
                                  {mat[l.material]}
                                </span>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  {l.material}
                                </Badge>
                                {l.isMine ? (
                                  <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">
                                    {mk.myListing}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="font-mono text-xs text-muted-foreground">
                                {l.id} · {s.seller} {l.seller}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 sm:gap-6">
                            <Stat label={mk.statQty} value={l.amount.toLocaleString()} />
                            <Stat
                              label={mk.statPrice}
                              value={l.pricePerUnit.toFixed(4)}
                              highlight
                            />
                            <Stat
                              label={s.total}
                              value={(l.pricePerUnit * l.amount).toFixed(2)}
                            />
                          </div>

                          <div className="flex gap-2 sm:ml-auto">
                            {l.isMine ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelListing(l.id)}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <X className="size-3.5" aria-hidden />
                                {mk.cancelOrder}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setBuyTarget(l)}
                                className="gap-1"
                              >
                                <ShoppingCart className="size-3.5" aria-hidden />
                                {mk.buy}
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {totalPages > 1 && (
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-xs text-muted-foreground">
                      {interpolate(mk.pageOf, {
                        cur: String(page + 1),
                        total: String(totalPages),
                      })}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        {s.prevPageAria}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                      >
                        {s.nextPageAria}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            <p className="text-[11px] text-muted-foreground">
              {mk.footnote}
            </p>
          </div>
        )}
      </main>

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

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  )
}

export function ListDialog({
  open,
  onOpenChange,
  inventory,
  isApproved,
  isTxPending,
  onApprove,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  inventory: Record<MaterialKey, number>
  isApproved: boolean
  isTxPending: boolean
  onApprove: () => Promise<boolean>
  onSubmit: (material: MaterialKey, amount: number, price: number) => void
}) {
  const { messages: m } = useLocale()
  const mk = m.game.market
  const s = m.game.shared
  const mat = m.game.materials

  const [material, setMaterial] = React.useState<MaterialKey>("AE")
  const [amount, setAmount] = React.useState(100)
  const [price, setPrice] = React.useState(0.01)

  const max = inventory[material]
  const ok = amount > 0 && amount <= max && price > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isTxPending) onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{mk.sellTitle}</DialogTitle>
          <DialogDescription>{mk.sellLead}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>{mk.material}</FieldLabel>
            <Select
              value={material}
              onValueChange={(v) => setMaterial(v as MaterialKey)}
              disabled={isTxPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {interpolate(mk.inventoryLine, {
                      code: k,
                      name: mat[k],
                      n: String(inventory[k]),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="amt">
              {interpolate(mk.maxQty, { n: String(max) })}
            </FieldLabel>
            <Input
              id="amt"
              type="number"
              min={1}
              max={max}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
              disabled={isTxPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="price">{mk.unitUsdt}</FieldLabel>
            <Input
              id="price"
              type="number"
              min={0}
              step={0.0001}
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              disabled={isTxPending}
            />
          </Field>
        </FieldGroup>

        {/* 两步进度指示：授权材料 → 挂单出售 */}
        <ol className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em]">
          <li
            className={cn(
              "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 transition",
              isApproved
                ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                : "border-primary/50 bg-primary/10 text-primary",
            )}
          >
            {isApproved ? (
              <ShieldCheck className="size-3.5" aria-hidden />
            ) : (
              <KeyRound className="size-3.5" aria-hidden />
            )}
            <span>{mk.stepAuthMat}</span>
          </li>
          <li className="text-muted-foreground" aria-hidden>
            →
          </li>
          <li
            className={cn(
              "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 transition",
              isApproved
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/30 text-muted-foreground",
            )}
          >
            <Tag className="size-3.5" aria-hidden />
            <span>{mk.stepList}</span>
          </li>
        </ol>

        <div className="rounded-lg border border-border bg-background/40 p-3 text-sm">
          <Row label={s.listTotal} value={`${(amount * price).toFixed(4)} USDT`} highlight />
          <Row
            label={s.buyerFeeRow}
            value={`${(amount * price * MARKET_FEE).toFixed(4)} USDT`}
            muted
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isTxPending}
          >
            {s.cancel}
          </Button>
          {isApproved ? (
            <Button
              disabled={!ok || isTxPending}
              onClick={() => onSubmit(material, amount, price)}
              className="gap-2"
            >
              {isTxPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Tag className="size-4" aria-hidden />
              )}
              {isTxPending ? s.submitting : s.confirmList}
            </Button>
          ) : (
            <Button
              onClick={() => {
                onApprove()
              }}
              disabled={isTxPending}
              className="gap-2"
            >
              {isTxPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <KeyRound className="size-4" aria-hidden />
              )}
              {isTxPending ? s.authorizing : s.authorizeMaterials}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BuyDialog({
  listing,
  usdtAllowance,
  isTxPending,
  onApprove,
  onClose,
  onSubmit,
}: {
  listing: MarketListing | null
  usdtAllowance: bigint
  isTxPending: boolean
  onApprove: () => Promise<boolean>
  onClose: () => void
  onSubmit: (amount: number) => void
}) {
  const { messages: m } = useLocale()
  const mk = m.game.market
  const s = m.game.shared

  const [amount, setAmount] = React.useState(0)

  React.useEffect(() => {
    if (listing) setAmount(listing.amount)
  }, [listing])

  if (!listing) return null

  const total = amount * listing.pricePerUnit
  const fee = total * MARKET_FEE
  const cost = total + fee
  const ok = amount > 0 && amount <= listing.amount

  // 把 UI 的 USDT cost (float) 转为链上 18 位 bigint，与 allowance 直接比较。
  // 浮点抖动加 1% buffer，避免边界值四舍五入后实际链上扣款略高于授权。
  const costChain = (() => {
    if (cost <= 0) return 0n
    const bumped = Math.ceil(cost * 1.01 * 1e6) // 6 位精度足够 USDT 价格
    return (BigInt(bumped) * 10n ** 18n) / 10n ** 6n
  })()
  const isApproved = usdtAllowance >= costChain
  const canSubmit = ok && !isTxPending

  const handleApprove = async () => {
    if (isTxPending) return
    await onApprove()
  }

  return (
    <Dialog
      open={!!listing}
      onOpenChange={(v) => {
        if (!isTxPending && !v) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {interpolate(mk.buyTitle, { code: listing.material })}
          </DialogTitle>
          <DialogDescription>
            {interpolate(mk.buyLead, { n: listing.amount.toLocaleString() })}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="buy-amt">{mk.buyQty}</FieldLabel>
            <Input
              id="buy-amt"
              type="number"
              min={1}
              max={listing.amount}
              value={amount}
              onChange={(e) =>
                setAmount(Math.max(0, Math.min(listing.amount, parseInt(e.target.value) || 0)))
              }
              disabled={isTxPending}
            />
          </Field>
        </FieldGroup>

        {/* 两步进度指示：授权 USDT → 确认购买 */}
        <ol className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em]">
          <li
            className={cn(
              "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 transition",
              isApproved
                ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                : "border-primary/50 bg-primary/10 text-primary",
            )}
          >
            {isApproved ? (
              <ShieldCheck className="size-3.5" aria-hidden />
            ) : (
              <KeyRound className="size-3.5" aria-hidden />
            )}
            <span>{mk.stepAuthUsdt}</span>
          </li>
          <li className="text-muted-foreground" aria-hidden>
            →
          </li>
          <li
            className={cn(
              "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 transition",
              isApproved
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/30 text-muted-foreground",
            )}
          >
            <ShoppingCart className="size-3.5" aria-hidden />
            <span>{mk.stepConfirm}</span>
          </li>
        </ol>

        <div className="rounded-lg border border-border bg-background/40 p-3 text-sm">
          <Row label={mk.rowUnit} value={`${listing.pricePerUnit.toFixed(4)} USDT`} />
          <Row label={s.rowGoods} value={`${total.toFixed(4)}`} />
          <Row label={s.feePctRow} value={`${fee.toFixed(4)}`} muted />
          <Row label={s.payTotal} value={`${cost.toFixed(4)} USDT`} highlight />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isTxPending}>
            {s.cancel}
          </Button>
          {isApproved ? (
            <Button
              disabled={!canSubmit}
              onClick={() => onSubmit(amount)}
              className="gap-2"
            >
              {isTxPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ShoppingCart className="size-4" aria-hidden />
              )}
              {isTxPending ? s.submitting : s.confirmBuy}
            </Button>
          ) : (
            <Button onClick={handleApprove} disabled={isTxPending} className="gap-2">
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
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono ${
          highlight ? "text-primary font-semibold" : muted ? "text-muted-foreground" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}
