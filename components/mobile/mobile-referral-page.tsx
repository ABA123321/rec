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

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { copyToClipboard } from "@/lib/clipboard"
import { interpolate } from "@/lib/i18n/interpolate"
import { REFERRAL_DIRECT, REFERRAL_INDIRECT } from "@/lib/game-data"
import { readReferralTeamStats, type ReferralTeamStats } from "@/lib/web3/reads"
import type { Address } from "viem"
import { MobilePageHeader, MobileSection } from "./mobile-shell"
// 复用桌面端纯展示组件，避免业务逻辑漂移
import {
  ChainAddress,
  TeamStat,
  shortAddr,
} from "@/components/desktop/desktop-referral-page"

const PENDING_REF_KEY = "rune-pending-ref"

export function MobileReferralPage() {
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

  // prefill 推荐人地址（与桌面端逻辑一致）
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (referrer) return
    try {
      const pending = window.localStorage.getItem(PENDING_REF_KEY)
      if (!pending) return
      if (address && pending.toLowerCase() === address.toLowerCase()) {
        window.localStorage.removeItem(PENDING_REF_KEY)
        return
      }
      setCode(pending)
    } catch {
      // localStorage 不可用，忽略
    }
  }, [address, referrer])

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
      <MobilePageHeader
        title={r.title}
        description={interpolate(r.descMobile, { d: dPct, i: iPct })}
      />

      <main className="flex-1 px-4 py-4 pb-24">
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
            {/* 我的邀请链接 */}
            <MobileSection eyebrow={r.inviteSectionTag} title={r.shareTitle}>
              {/* 钱包地址（即邀请凭证） */}
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                <Users className="size-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                    {r.myAddressCaption}
                  </div>
                  <div className="truncate font-mono text-xs text-primary">
                    {shortAddr(myAddress)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => copy(myAddress, s.labelWallet)}
                  aria-label={r.copyWalletAria}
                >
                  <Copy className="size-3.5" aria-hidden />
                </Button>
              </div>

              {/* 邀请链接 */}
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2.5">
                <Link2
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/80"
                  title={referralLink}
                >
                  …/?ref={shortAddr(myAddress)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => copy(referralLink, s.labelInviteLink)}
                  aria-label={r.copyInviteLinkAria}
                >
                  <Copy className="size-3.5" aria-hidden />
                </Button>
              </div>

              {/* 分润比例 */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <RatioStat label={r.lv1Short} value={`${dPct}%`} hint={r.hintLv1} />
                <RatioStat label={r.lv2Short} value={`${iPct}%`} hint={r.hintLv2} />
              </div>
            </MobileSection>

            {/* 自助绑定推荐人 */}
            <MobileSection eyebrow={r.referrerSectionTag} title={r.bindTitle}>
              {referrer ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-chart-2/40 bg-chart-2/10 px-3 py-2.5 text-chart-2">
                    <ShieldCheck className="size-4 shrink-0" aria-hidden />
                    <span
                      className="min-w-0 flex-1 truncate font-mono text-xs"
                      title={referrer}
                    >
                      {referrer}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{r.bindIrreversible}</p>
                </div>
              ) : (
                <FieldGroup>
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
                    className="w-full gap-2"
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
            </MobileSection>

            {/* 团队人数 */}
            <MobileSection
              eyebrow={r.teamSectionTag}
              title={r.teamSizeTitle}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2"
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
              }
            >
              <div className="grid grid-cols-3 gap-2">
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
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
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
            </MobileSection>

            {/* 推荐链路 */}
            <MobileSection eyebrow={r.chainSectionTag} title={r.chainTitle}>
              <ul className="flex flex-col gap-2">
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

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <Hourglass
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <p>{interpolate(r.explainerLead, { d: dPct, i: iPct })}</p>
              </div>
            </MobileSection>
          </div>
        )}
      </main>
    </>
  )
}

function RatioStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-xl text-primary">{value}</div>
      {hint ? (
        <div className="mt-0.5 text-[9px] leading-snug text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  )
}
