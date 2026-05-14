"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  Hourglass,
  Layers,
  Link2,
  Loader2,
  Network,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react"

import { TopBar } from "@/components/game/top-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { copyToClipboard } from "@/lib/clipboard"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { REFERRAL_DIRECT, REFERRAL_INDIRECT } from "@/lib/game-data"
import { readReferralTeamStats, type ReferralTeamStats } from "@/lib/web3/reads"
import type { Address } from "viem"

const PENDING_REF_KEY = "rune-pending-ref"

export function shortAddr(addr?: string) {
  if (!addr) return "—"
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function DesktopReferralPage() {
  const { messages: loc } = useLocale()
  const r = loc.game.referral
  const s = loc.game.shared
  const dPct = (REFERRAL_DIRECT * 100).toFixed(0)
  const iPct = (REFERRAL_INDIRECT * 100).toFixed(0)

  const {
    connected,
    connect,
    address,
    referrer,
    effectiveDirect,
    effectiveIndirect,
    bindReferrer,
    isTxPending,
  } = useGame()

  const [code, setCode] = React.useState("")

  // 链上团队统计 — 优先读 ReferralRegistry 计数视图，失败时回退事件扫描
  // readReferralTeamStats 永不抛错：失败时会返回全 0 + fresh=false，UI 据此提示是否同步成功
  const [stats, setStats] = React.useState<ReferralTeamStats | null>(null)
  const [statsLoading, setStatsLoading] = React.useState(false)

  const loadStats = React.useCallback(async (addr: Address) => {
    setStatsLoading(true)
    const data = await readReferralTeamStats(addr)
    setStats(data)
    setStatsLoading(false)
  }, [])

  React.useEffect(() => {
    if (!address) {
      setStats(null)
      return
    }
    loadStats(address as Address)
  }, [address, loadStats])

  // 自助绑定 prefill：被邀请者通过 ?ref=0x... 落地任意页面后，GameProvider 已把地址写到
  // localStorage；这里在挂载时读出来，并在 referrer 已绑定 / 等于自己时清掉。
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (referrer) return // 已绑定就不再 prefill
    try {
      const pending = window.localStorage.getItem(PENDING_REF_KEY)
      if (!pending) return
      if (address && pending.toLowerCase() === address.toLowerCase()) {
        // 自己点了自己的链接 — 清理无效缓存
        window.localStorage.removeItem(PENDING_REF_KEY)
        return
      }
      setCode(pending)
    } catch {
      // localStorage 不可用，忽略
    }
  }, [address, referrer])

  // 邀请链接基于钱包地址（合约里 bindReferrer 接受的是 address，没有"码"概念）
  const myAddress = address ?? ""
  const referralLink =
    typeof window !== "undefined"
      ? myAddress
        ? `${window.location.origin}/?ref=${myAddress}`
        : ""
      : myAddress
        ? `https://runeas.xyz/?ref=${myAddress}`
        : ""

  const copy = async (text: string, label: string) => {
    if (!text) return
    const ok = await copyToClipboard(text)
    if (ok) {
      toast.success(interpolate(s.copySuccess, { label }))
    } else {
      toast.error(s.copyFailed)
    }
  }

  const handleBind = async () => {
    const trimmed = code.trim()
    if (!trimmed) return
    const ok = await bindReferrer(trimmed)
    if (ok) {
      setCode("")
      try {
        window.localStorage.removeItem(PENDING_REF_KEY)
      } catch {
        // ignore
      }
    }
  }

  return (
    <>
      <TopBar
        title={r.title}
        description={interpolate(r.descDesktop, { d: dPct, i: iPct })}
      />

      <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
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
          <div className="grid gap-5 lg:grid-cols-3">
            {/* 我的邀请链接 */}
            <Card className="border-border bg-card/60 lg:col-span-2">
              <CardContent className="p-4 sm:p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {r.inviteSectionTag}
                </p>
                <h2 className="font-serif text-lg sm:text-xl">{r.shareTitle}</h2>

                <div className="mt-4 flex flex-col gap-3">
                  {/* 钱包地址（即邀请凭证 — 合约 bindReferrer 接受的 referrer 参数） */}
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 sm:px-4 sm:py-3">
                    <Users className="size-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        {r.myAddressCaption}
                      </div>
                      <div className="truncate font-mono text-sm text-primary sm:text-base">
                        {myAddress}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 sm:size-auto sm:px-3"
                      onClick={() => copy(myAddress, s.labelWallet)}
                      aria-label={r.copyWalletAria}
                    >
                      <Copy className="size-3.5" aria-hidden />
                      <span className="hidden sm:ml-1 sm:inline">{s.copy}</span>
                    </Button>
                  </div>

                  {/* 邀请链接 */}
                  <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/80 sm:hidden"
                        title={referralLink}
                      >
                        …/?ref={shortAddr(myAddress)}
                      </span>
                      <span
                        className="hidden min-w-0 flex-1 truncate font-mono text-sm sm:inline-block"
                        title={referralLink}
                      >
                        {referralLink}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 sm:size-auto sm:px-3"
                        onClick={() => copy(referralLink, s.labelInviteLink)}
                        aria-label={r.copyInviteLinkAria}
                      >
                        <Copy className="size-3.5" aria-hidden />
                        <span className="hidden sm:ml-1 sm:inline">{s.copy}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Stat
                    label={r.lv1Short}
                    value={`${dPct}%`}
                    hint={r.hintLv1}
                  />
                  <Stat
                    label={r.lv2Short}
                    value={`${iPct}%`}
                    hint={r.hintLv2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 自助绑定推荐人 */}
            <Card className="border-border bg-card/60">
              <CardContent className="p-4 sm:p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {r.referrerSectionTag}
                </p>
                <h2 className="font-serif text-lg sm:text-xl">{r.bindTitle}</h2>

                {referrer ? (
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 rounded-lg border border-chart-2/40 bg-chart-2/10 px-3 py-2.5 text-chart-2 sm:px-4 sm:py-3">
                      <ShieldCheck className="size-4 shrink-0" aria-hidden />
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm"
                        title={referrer}
                      >
                        {referrer}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{r.bindIrreversible}</p>
                  </div>
                ) : (
                  <FieldGroup className="mt-4">
                    <Field>
                      <FieldLabel htmlFor="ref-code">{r.refAddrLabel}</FieldLabel>
                      <Input
                        id="ref-code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.trim())}
                        placeholder="0x..."
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        className="font-mono"
                        disabled={isTxPending}
                      />
                    </Field>
                    <Button
                      onClick={handleBind}
                      disabled={!code.trim() || isTxPending}
                      className="gap-2"
                    >
                      {isTxPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <ShieldCheck className="size-4" aria-hidden />
                      )}
                      {isTxPending ? s.binding : r.bindSelf}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">{r.unboundHint}</p>
                  </FieldGroup>
                )}
              </CardContent>
            </Card>

            {/* 团队人数统计 — 真实链上数据（基于 ReferrerBound 事件） */}
            <Card className="border-border bg-card/60 lg:col-span-3">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {r.teamSectionTag}
                    </p>
                    <h2 className="font-serif text-lg sm:text-xl">{r.teamSizeTitle}</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => address && loadStats(address as Address)}
                    disabled={!address || statsLoading}
                    aria-label={r.refreshAria}
                  >
                    <RefreshCw
                      className={`size-3.5 ${statsLoading ? "animate-spin" : ""}`}
                      aria-hidden
                    />
                    <span className="text-xs">{r.refresh}</span>
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <TeamStat
                    icon={Network}
                    label={r.totalMembers}
                    value={stats?.teamCount ?? 0}
                    loading={statsLoading}
                    tone="primary"
                  />
                  <TeamStat
                    icon={UserPlus}
                    label={r.lv1}
                    value={stats?.directCount ?? 0}
                    loading={statsLoading}
                    tone="accent"
                  />
                  <TeamStat
                    icon={Layers}
                    label={r.lv2}
                    value={stats?.indirectCount ?? 0}
                    loading={statsLoading}
                    tone="muted"
                  />
                </div>

                <p className="mt-3 text-[11px] text-muted-foreground">
                  {stats && !stats.fresh && !statsLoading ? (
                    <>
                      <span className="text-chart-5">{r.rpcBusy}</span> · {r.rpcBusyHint}
                    </>
                  ) : (
                    <>
                      {(() => {
                        const parts = r.chainHint.split("ReferralRegistry")
                        if (parts.length === 2) {
                          return (
                            <>
                              {parts[0]}
                              <span className="font-mono">ReferralRegistry</span>
                              {parts[1]}
                            </>
                          )
                        }
                        return r.chainHint
                      })()}
                    </>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* 推荐关系链 — 真实链上数据 */}
            <Card className="border-border bg-card/60 lg:col-span-3">
              <CardContent className="p-4 sm:p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {r.chainSectionTag}
                </p>
                <h2 className="font-serif text-lg sm:text-xl">{r.chainTitle}</h2>

                <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ChainAddress
                    icon={ArrowUpRight}
                    label={r.uplinkL1}
                    address={effectiveDirect}
                    fallback={referrer ? r.referrerPending : r.referrerNone}
                    tone="primary"
                  />
                  <ChainAddress
                    icon={ArrowDownRight}
                    label={r.uplinkL2}
                    address={effectiveIndirect}
                    fallback={r.uplinkFallback}
                    tone="accent"
                  />
                </ul>

                <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-background/40 p-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  <Hourglass className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p>{interpolate(r.explainerLead, { d: dPct, i: iPct })}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </>
  )
}

export function TeamStat({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof Users
  label: string
  value: number
  loading: boolean
  tone: "primary" | "accent" | "muted"
}) {
  const { messages: loc } = useLocale()
  const membersUnit = loc.game.referral.teamMembersUnit
  const valueColor =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : "text-foreground"
  const borderColor =
    tone === "primary"
      ? "border-primary/30"
      : tone === "accent"
        ? "border-accent/30"
        : "border-border"
  const iconColor =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : "text-muted-foreground"

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border ${borderColor} bg-background/40 p-3 sm:p-4`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={`size-3.5 ${iconColor}`} aria-hidden />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:text-[11px]">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-serif text-2xl sm:text-3xl ${valueColor} ${
            loading ? "opacity-50" : ""
          }`}
        >
          {value.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">{membersUnit}</span>
        {loading ? (
          <Loader2
            className="ml-1 size-3 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 sm:p-4">
      <div className="text-[11px] text-muted-foreground sm:text-xs">{label}</div>
      <div className="mt-1 font-serif text-xl text-primary sm:text-2xl">{value}</div>
      {hint ? (
        <div className="mt-1 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
          {hint}
        </div>
      ) : null}
    </div>
  )
}

export function ChainAddress({
  icon: Icon,
  label,
  address,
  fallback,
  tone,
}: {
  icon: typeof Users
  label: string
  address?: string
  fallback: string
  tone: "primary" | "accent"
}) {
  const color = tone === "primary" ? "text-primary" : "text-accent"
  const borderColor = tone === "primary" ? "border-primary/30" : "border-accent/30"
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border ${address ? borderColor : "border-border"} bg-background/40 p-3 sm:p-4`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card/60 sm:size-10 ${address ? borderColor : "border-border"}`}
      >
        <Icon className={`size-4 ${address ? color : "text-muted-foreground"}`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</div>
        {address ? (
          <div
            className={`truncate font-mono text-sm ${color}`}
            title={address}
          >
            {address}
          </div>
        ) : (
          <div className="truncate text-sm text-muted-foreground">{fallback}</div>
        )}
      </div>
    </li>
  )
}
