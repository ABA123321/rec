"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { isAddress } from "viem"
import { LogOut, Loader2, Wallet } from "lucide-react"

import { useGame } from "@/components/providers/game-provider"
import { useLocale } from "@/components/providers/locale-provider"
import { interpolate } from "@/lib/i18n/interpolate"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function WalletButton({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  const router = useRouter()
  const { messages: m } = useLocale()
  const w = m.game.wallet
  const s = m.game.shared
  const {
    connected,
    address,
    shortAddress,
    chainId,
    walletKind,
    isRealWallet,
    connect,
    disconnect,
    advent,
    usdt,
    bindReferrer,
    isTxPending,
  } = useGame()

  // 推荐绑定对话框状态：弹窗打开 + 推荐地址 + 绑定中标记
  const [showRefDialog, setShowRefDialog] = React.useState(false)
  const [refAddr, setRefAddr] = React.useState<string | null>(null)
  const [bindingRef, setBindingRef] = React.useState(false)

  const handleConnect = React.useCallback(async () => {
    await connect()
    // 连接成功后，检查 URL 是否有 ?ref= 参数
    setTimeout(() => {
      const ref = new URLSearchParams(window.location.search).get("ref")
      if (ref && isAddress(ref)) {
        // 弹出推荐绑定对话框，并设置推荐人地址
        setRefAddr(ref.toLowerCase())
        setShowRefDialog(true)
      } else {
        // 没有推荐链接，直接进入游戏
        router.push("/game")
      }
    }, 100)
  }, [connect, router])

  // 绑定推荐人的处理函数
  const handleBindRef = React.useCallback(async () => {
    if (!refAddr) return
    setBindingRef(true)
    try {
      const ok = await bindReferrer(refAddr as any)
      if (ok) {
        setShowRefDialog(false)
        setRefAddr(null)
        router.push("/game")
      }
    } finally {
      setBindingRef(false)
    }
  }, [refAddr, bindReferrer, router])

  // 跳过绑定，直接进入游戏
  const handleSkipRef = React.useCallback(() => {
    setShowRefDialog(false)
    setRefAddr(null)
    router.push("/game")
  }, [router])

  if (!connected) {
    return (
      <Button
        onClick={handleConnect}
        size={size}
        className="gap-2 px-3 font-medium sm:px-4"
      >
        <Wallet className="size-4" aria-hidden />
        <span className="hidden sm:inline">{s.connectWallet}</span>
        <span className="sm:hidden">{s.connectWalletShort}</span>
      </Button>
    )
  }

  // 推荐绑定对话框
  return (
    <>
      <Dialog open={showRefDialog} onOpenChange={setShowRefDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{w.refDetectedTitle}</DialogTitle>
            <DialogDescription>{w.refDetectedDesc}</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {w.refWalletCaption}
            </p>
            <p className="mt-2 break-all font-mono text-sm text-foreground">{refAddr}</p>
          </div>

          <p className="text-xs text-muted-foreground">{w.refBindHint}</p>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleSkipRef}
              disabled={bindingRef || isTxPending}
            >
              {w.skip}
            </Button>
            <Button
              onClick={handleBindRef}
              disabled={bindingRef || isTxPending}
              className="gap-2"
            >
              {bindingRef || isTxPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {bindingRef ? s.binding : w.confirmBind}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 原有的钱包信息下拉菜单 */}
      {/* 极简移动端展示（0xabcd…ef12 进一步压缩） */}
      {address && (
        (() => {
          const compact = `${address.slice(0, 4)}…${address.slice(-3)}`
          const onBsc = chainId === 56
          const dotColor = onBsc ? "bg-accent" : "bg-chart-5"

          return (
            <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className="gap-2 px-2.5 font-mono text-xs sm:gap-3 sm:px-4 sm:text-sm"
          aria-label={interpolate(s.walletAria, { addr: address })}
        >
          <span
            className={`size-2 rounded-full ${dotColor} shadow-[0_0_8px_currentColor]`}
            aria-hidden
          />
          <span className="sm:hidden">{compact}</span>
          <span className="hidden sm:inline">{shortAddress ?? address}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 font-serif">
          <span>{s.wallet}</span>
          <span
            className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
              isRealWallet
                ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                : "border-chart-5/40 bg-chart-5/10 text-chart-5"
            }`}
          >
            {isRealWallet ? s.liveMode : s.demoMode}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem disabled className="flex justify-between">
          <span className="text-muted-foreground">{s.wallet}</span>
          <span className="font-mono text-foreground">{walletKind ?? s.notAvailable}</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="flex justify-between">
          <span className="text-muted-foreground">{s.network}</span>
          <span
            className={`font-mono ${onBsc ? "text-chart-2" : "text-chart-5"}`}
          >
            {chainId ? `${s.chain} ${chainId}${onBsc ? " · BSC" : ""}` : s.notAvailable}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="flex justify-between gap-3">
          <span className="text-muted-foreground">{s.address}</span>
          <span className="truncate font-mono text-foreground">{shortAddress ?? address}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled className="flex justify-between">
          <span className="text-muted-foreground">$草根社</span>
          <span className="font-mono text-foreground">{advent.toLocaleString()}</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="flex justify-between">
          <span className="text-muted-foreground">USDT</span>
          <span className="font-mono text-foreground">{usdt.toFixed(2)}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={disconnect}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" aria-hidden />
          {s.disconnect}
        </DropdownMenuItem>
      </DropdownMenuContent>
        </DropdownMenu>
          )
        })()
      )}
    </>
  )
}
