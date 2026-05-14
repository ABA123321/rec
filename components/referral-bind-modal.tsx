"use client"

import * as React from "react"
import { Loader2, ShieldCheck, Sparkles } from "lucide-react"

import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { REFERRAL_DIRECT, REFERRAL_INDIRECT } from "@/lib/game-data"

const PENDING_REF_KEY = "rune-pending-ref"
const DISMISSED_KEY = "rune-pending-ref-dismissed"

function shortAddr(addr: string) {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/**
 * 推荐绑定弹窗
 *
 * 触发条件（全部满足时显示）：
 *  1. URL 曾带有 ?ref=<address>，被 GameProvider 写入 localStorage[PENDING_REF_KEY]
 *  2. 钱包已连接
 *  3. 当前用户尚未绑定推荐人（链上 referrer 为空）
 *  4. 推荐人地址不是自己
 *  5. 用户在本会话中尚未点击"稍后再说"（sessionStorage 标记）
 *
 * 用户点击「立即绑定」走链上 bindReferrer 交易，成功后清掉 pending；
 * 点击「稍后再说」仅本会话内不再弹（刷新或重新进入会再弹一次）。
 */
export function ReferralBindModal() {
  const { messages: loc } = useLocale()
  const w = loc.game.wallet
  const s = loc.game.shared
  const { connected, address, referrer, bindReferrer, isTxPending } = useGame()
  const [open, setOpen] = React.useState(false)
  const [pendingRef, setPendingRef] = React.useState<string | null>(null)

  // 监听条件变化决定是否打开
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!connected || !address) {
      setOpen(false)
      return
    }
    // 已绑定不再提示
    if (referrer) {
      setOpen(false)
      return
    }
    let pending: string | null = null
    try {
      pending = window.localStorage.getItem(PENDING_REF_KEY)
    } catch {
      return
    }
    if (!pending) return
    // 自己点了自己的链接 — 清理无效缓存
    if (pending.toLowerCase() === address.toLowerCase()) {
      try {
        window.localStorage.removeItem(PENDING_REF_KEY)
      } catch {
        /* noop */
      }
      return
    }
    // 本会话内已点过"稍后再说"
    try {
      if (window.sessionStorage.getItem(DISMISSED_KEY) === pending.toLowerCase()) {
        return
      }
    } catch {
      /* noop */
    }
    setPendingRef(pending)
    setOpen(true)
  }, [connected, address, referrer])

  const handleBind = async () => {
    if (!pendingRef) return
    const ok = await bindReferrer(pendingRef)
    if (ok) {
      try {
        window.localStorage.removeItem(PENDING_REF_KEY)
        window.sessionStorage.removeItem(DISMISSED_KEY)
      } catch {
        /* noop */
      }
      setOpen(false)
    }
  }

  const handleDismiss = () => {
    if (pendingRef) {
      try {
        window.sessionStorage.setItem(DISMISSED_KEY, pendingRef.toLowerCase())
      } catch {
        /* noop */
      }
    }
    setOpen(false)
  }

  if (!pendingRef) return null

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleDismiss())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
            <Sparkles className="size-6 text-primary" aria-hidden />
          </div>
          <DialogTitle className="text-center font-serif text-xl">
            {w.refInviteFoundTitle}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            {w.refInviteFoundDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {w.refWalletCaption}
            </div>
            <div
              className="mt-1 truncate font-mono text-sm text-primary"
              title={pendingRef}
            >
              <span className="sm:hidden">{shortAddr(pendingRef)}</span>
              <span className="hidden sm:inline">{pendingRef}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background/40 p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {w.refInviteLv1}
              </div>
              <div className="mt-1 font-serif text-xl text-primary">
                {(REFERRAL_DIRECT * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {w.refInviteLv2}
              </div>
              <div className="mt-1 font-serif text-xl text-accent">
                {(REFERRAL_INDIRECT * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {w.refInviteFootnote}
          </p>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isTxPending}
            className="sm:flex-1"
          >
            {w.refInviteLater}
          </Button>
          <Button
            onClick={handleBind}
            disabled={isTxPending}
            className="gap-2 sm:flex-1"
          >
            {isTxPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="size-4" aria-hidden />
            )}
            {isTxPending ? s.binding : w.refInviteBindNow}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
